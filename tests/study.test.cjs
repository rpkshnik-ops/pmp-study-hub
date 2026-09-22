const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js'),S=require('../study.js'),L=require('../learning.js');
const time='2026-09-22T12:00:00Z';
const base={id:'Q1',version:3,type:'single',prompt:'Pick a colour',options:['red','blue','green','white'],correct:[1],explanations:['R','B','G','W'],principle:'Colours',hint:'Think',scenarioFamilyId:'F1',eco:{domain:'People',taskId:1},status:'model_reviewed',reserve:false,lessonId:'L01'};
const snapshot=()=>structuredClone(base);
const attempt=(q,id,extra={})=>({id,sessionId:'session',questionId:q.id,questionVersion:q.version,questionSnapshot:structuredClone(q),answer:q.correct,correct:true,confidence:3,assisted:false,priorExposure:false,answeredAt:time,elapsedSeconds:5,...extra});
const lesson=questions=>({id:'L01',version:3,objectives:['Explain'],recall:{prompts:[]},transferCase:{context:'Scenario',prompts:[]},stretch:{prompt:'More'},artifact:{title:'Plan',instructions:'Write',rubric:[]},lab:{objective:'Analyse',steps:[]},questions});
const cases=()=>[1,2,3].map(n=>({...snapshot(),id:'Q'+n,caseId:'CASE1',casePosition:n}));
const session=qs=>({id:'session',kind:'case',lessonId:'L01',questionIds:qs.map(q=>q.id),questionSnapshots:Object.fromEntries(qs.map(q=>[q.id,S.prepareQuestion(q,()=>0)])),index:0,startedAt:time,deadline:'',draftAnswers:{},confidence:{},assisted:{},started:{},responseIds:[],finished:false});

test('shuffling preserves answer meaning and each option explanation without mutating content',()=>{
 for(const type of ['single','multi'])for(const random of [()=>0,()=>.5,()=>.999]){
  const original={...snapshot(),type,correct:type==='single'?[1]:[1,3]},before=JSON.stringify(original),q=S.prepareQuestion(original,random);
  assert.deepEqual(q.correct.map(i=>q.options[i]).sort(),original.correct.map(i=>original.options[i]).sort());
  q.options.forEach((option,i)=>assert.equal(q.explanations[i],original.explanations[original.options.indexOf(option)]));
  assert.ok(C.grade(q,q.correct));assert.equal(C.grade(q,[q.options.indexOf('red')]),false);assert.equal(JSON.stringify(original),before);
 }
});

test('matching shuffles only right choices and remaps all pairs; numeric values stay unchanged',()=>{
 const original={...snapshot(),type:'matching',left:['A','B'],right:['one','two','three'],correct:[2,0],explanations:['A to three','B to one']};
 const q=S.prepareQuestion(original,()=>0);assert.deepEqual(q.left,original.left);assert.deepEqual(q.explanations,original.explanations);
 assert.deepEqual(q.correct.map(i=>q.right[i]),['three','one']);assert.ok(C.grade(q,q.correct));
 const numeric={...snapshot(),type:'numeric',answer:12.5,tolerance:.01,unit:'days'};assert.deepEqual(S.prepareQuestion(numeric),numeric);
});

test('session and attempts retain shuffled choices, tables and v2 snapshots across export/import',()=>{
 const qs=cases();qs[0].stimulus={title:'Data',context:'Use the table',table:{caption:'Input',columns:['Name','Value'],rows:[['A','3']]}};
 const state=C.createState();state.sessions.quiz=session(qs);
 const q=state.sessions.quiz.questionSnapshots.Q1;state.sessions.quiz.draftAnswers.Q1=q.correct;state.sessions.quiz.confidence.Q1=3;
 state.attempts=[attempt(q,'a'),attempt({...snapshot(),version:2,correct:[0]},'old')];state.sessions.quiz.responseIds=['a'];
 const restored=C.parseImport(JSON.stringify({schemaVersion:2,state}));
 assert.deepEqual(restored.sessions.quiz,state.sessions.quiz);assert.deepEqual(restored.attempts[0].questionSnapshot,q);assert.equal(restored.attempts[0].sessionId,'session');
 assert.equal(restored.attempts[1].questionVersion,2);assert.ok(C.grade(restored.attempts[1].questionSnapshot,[0]));assert.equal(C.grade(base,[0]),false);
 for(const mutate of [s=>s.questionSnapshots.Q1.stimulus.table.rows[0].push('bad'),s=>s.questionSnapshots.Q2.caseId='OTHER',s=>delete s.questionSnapshots.Q2,s=>{s.questionIds.pop();delete s.questionSnapshots.Q3;}]){
  const invalid=structuredClone(state);mutate(invalid.sessions.quiz);assert.throws(()=>C.parseImport(JSON.stringify({schemaVersion:2,state:invalid})));
 }
});

test('a complete case is one observation requiring all correct answers, and no hints',()=>{
 const qs=cases(),ls=[lesson(qs)],state=C.createState();state.attempts=qs.map((q,i)=>attempt(q,'a'+i));
 let stats=L.statistics(ls,state);assert.equal(stats.overall.n,1);assert.equal(stats.overall.correct,1);
 state.attempts[2].correct=false;assert.equal(L.statistics(ls,state).overall.correct,0);
 state.attempts[1].assisted=true;stats=L.statistics(ls,state);assert.equal(stats.overall.n,0);assert.equal(stats.helped,1);
 state.attempts[1].assisted=false;state.attempts[2].priorExposure=true;assert.equal(L.statistics(ls,state).repeated,1);
});

test('case answers from different sessions or partial cases cannot combine into a pass',()=>{
 const qs=cases(),ls=[lesson(qs)],state=C.createState();state.attempts=qs.slice(0,2).map((q,i)=>attempt(q,'a'+i));
 assert.equal(L.statistics(ls,state).overall.n,0);assert.equal(L.statistics(ls,state).pendingCases,1);
 state.attempts.push(attempt(qs[2],'other',{sessionId:'another'}));assert.equal(L.statistics(ls,state).overall.n,0);
});

test('unfinished deferred sessions hide evidence in both active and saved sessions',()=>{
 const qs=cases(),ls=[lesson(qs)],state=C.createState();state.attempts=qs.map((q,i)=>attempt(q,'a'+i));
 const s=session(qs);s.responseIds=state.attempts.map(a=>a.id);state.sessions.quiz=s;
 assert.equal(L.statistics(ls,state).overall.n,0);
 state.sessions.quiz=null;state.sessions.saved={session:s};assert.equal(L.statistics(ls,state).overall.n,0);
 s.finished=true;assert.equal(L.statistics(ls,state).overall.n,1);
});

test('finishing a repeated case after an abandoned attempt remains familiar evidence',()=>{
 const qs=cases(),ls=[lesson(qs)],state=C.createState();state.attempts=[attempt(qs[0],'abandoned',{sessionId:'old',answeredAt:'2026-09-21T10:00:00Z'}),...qs.map((q,i)=>attempt(q,'a'+i))];
 const report=L.statistics(ls,state);assert.equal(report.overall.n,0);assert.equal(report.repeated,1);assert.equal(report.pendingCases,0);
});

test('quarantine removes a whole linked family from selection and evidence',()=>{
 const qs=cases(),ls=[lesson(qs)],state=C.createState();state.attempts=qs.map((q,i)=>attempt(q,'a'+i));state.quarantined=[{questionId:'Q2'}];
 assert.deepEqual(S.available(qs,state),[]);assert.equal(L.statistics(ls,state).overall.n,0);
 assert.deepEqual(L.freshQuestions(ls,C.createState()),[]);
});

test('new lab work has a separate completion key and preserves previous challenge notes',()=>{
 const l=lesson([snapshot()]),state=C.createState();state.lessonWork.L01={fields:{'plan-foundation-all-challenge-done':time,'plan-foundation-all-challengenote':'Old work'},revealed:[]};
 const task=L.week(l,state,time).items.find(t=>t.id==='challenge');assert.equal(task.done,false);assert.equal(task.step,'lab');assert.equal(S.labKey(l),'lab-v3-');
 state.lessonWork.L01.fields[task.key+'-done']=time;assert.equal(L.week(l,state,time).items.find(t=>t.id==='challenge').done,true);
 assert.equal(state.lessonWork.L01.fields['plan-foundation-all-challengenote'],'Old work');
});

test('old attempts without exposure records still prevent presenting a revised item as unseen',()=>{
 const state=C.createState(),q=snapshot();state.attempts=[attempt({...q,version:2},'old')];
 assert.equal(state.exposures.length,0);assert.ok(S.wasSeen(q,state));assert.deepEqual(L.freshQuestions([lesson([q])],state),[]);
 assert.ok(S.wasSeen({...q,id:'another-variant'},state));
 state.attempts[0].answeredAt='2026-09-21T10:00:00Z';state.attempts.push(attempt(q,'new',{priorExposure:false}));
 const report=L.statistics([lesson([q])],state);assert.equal(report.overall.n,0);assert.equal(report.repeated,1);
});

test('legacy readiness excludes familiar, obsolete and linked-case evidence',()=>{
 const q=snapshot(),qs=cases();
 assert.equal(C.readiness([q],[attempt(q,'new')]).eligible,1);
 assert.equal(C.readiness([q],[attempt(q,'seen',{priorExposure:true})]).eligible,0);
 const old=attempt({...q,version:2},'old',{answeredAt:'2026-09-21T10:00:00Z'});
 assert.equal(C.readiness([q],[attempt(q,'new'),old]).eligible,0);
 assert.equal(C.readiness(qs,qs.map((item,i)=>attempt(item,'case'+i))).eligible,0);
});

test('import rejects snapshots without a family or duplicate case positions',()=>{
 const state=C.createState();state.sessions.quiz=session(cases());
 delete state.sessions.quiz.questionSnapshots.Q1.scenarioFamilyId;
 assert.throws(()=>C.parseImport(JSON.stringify({schemaVersion:2,state})));
 state.sessions.quiz=session(cases());state.sessions.quiz.questionSnapshots.Q3.casePosition=2;
 assert.throws(()=>C.parseImport(JSON.stringify({schemaVersion:2,state})));
});

test('incomplete or partly unapproved case families cannot be selected or scored',()=>{
 for(const mutate of [qs=>qs.pop(),qs=>qs[1].status='draft',qs=>qs[1].caseId='OTHER',qs=>qs[1].casePosition=1]){
  const qs=cases(),state=C.createState();state.attempts=qs.map((q,i)=>attempt(q,'a'+i));mutate(qs);
  assert.deepEqual(S.available(qs,state),[]);
  assert.equal(L.statistics([lesson(qs)],state).overall.n,0);
 }
});

test('legacy draft without its original snapshot cannot be graded against current options',()=>{
 const s=session(cases());s.kind='practice';s.questionIds=['Q1'];s.questionSnapshots={};
 assert.equal(S.missingSnapshot(s),false);
 s.draftAnswers.Q1=[0];assert.equal(S.missingSnapshot(s),true);
 s.questionSnapshots.Q1={...snapshot(),version:2};assert.equal(S.missingSnapshot(s),false);
 delete s.questionSnapshots.Q1;delete s.draftAnswers.Q1;s.started.Q1=time;
 assert.equal(S.missingSnapshot(s),true);
 s.responseIds[0]='already-graded';assert.equal(S.missingSnapshot(s),false);
});
