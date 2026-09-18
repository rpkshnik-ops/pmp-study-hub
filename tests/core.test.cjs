const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');
function memory(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
const question=(id='Q01-1',domain='People',family=id)=>({id,version:2,prompt:'Ситуация '+id,type:'single',correct:[1],options:['A','B'],explanations:['a','b'],status:'model_reviewed',scenarioFamilyId:family,reserve:true,eco:{domain}});
const attempt=(q,extra={})=>({id:'a',questionId:q.id,questionVersion:q.version,questionSnapshot:q,answer:[1],correct:true,confidence:3,assisted:false,answeredAt:'2026-09-18T12:00:00Z',elapsedSeconds:12,...extra});

test('migrate the real unversioned v1 shape, preserve name, notes and timestamps, archive old scores',()=>{
 const old={profile:{name:'Тест',education:'unknown',hours:5,language:'ru',examDate:''},onboarding:true,settings:{mode:'practice'},attempts:{'Q01-1':{correct:true,answeredAt:1789732800000}},completedLessons:['L01'],journal:[{at:1789732800000,note:'Ценная запись'}],experience:[{id:'e',title:'Проект',start:'2026-01',end:'2026-06'}],reviews:{'C01-1':{due:1789732800000,interval:3}},backups:[{state:{backups:[]}}]};
 const store=memory();store.setItem(C.LEGACY_KEY,JSON.stringify(old));const {state}=C.load(store);
 assert.equal(state.profile.name,'Тест');assert.equal(state.onboarding,true);assert.equal(state.settings.mode,'practice');
 assert.equal(state.journal[0].note,'Ценная запись');assert.equal(state.journal[0].at,1789732800000);
 assert.equal(state.attempts.length,0);assert.deepEqual(state.completedLessons,[]);assert.deepEqual(state.reviews,{});
 assert.equal(state.legacy.attempts['Q01-1'].correct,true);assert.equal(state.legacy.reviews['C01-1'].interval,3);
 C.save(store,state);assert.equal(C.load(store).state.journal[0].note,'Ценная запись');assert.equal(JSON.parse(store.getItem(C.LEGACY_KEY)).onboarding,true);
});
test('import validation rejects nested malformed records, prototype pollution and unsupported versions',()=>{
 const state=C.createState();
 for(const change of [s=>s.profile.hours='5',s=>s.lessonWork.L01={fields:[],revealed:[]},s=>s.journal=[{note:3,at:'now'}],s=>s.experience=[{title:'x',start:'2026-14',end:'2026-15'}],s=>s.reviews.c={dueAt:'no',intervalDays:1},s=>s.sessions.quiz={index:'NaN'},s=>s.attempts=[{...attempt(question()),correct:'false'}]]){
  const bad=structuredClone(state);change(bad);assert.throws(()=>C.parseImport(JSON.stringify({schemaVersion:2,state:bad})));
 }
 assert.throws(()=>C.parseImport('{"schemaVersion":2,"state":{"__proto__":{"polluted":true}}}'));
 assert.equal({}.polluted,undefined);assert.throws(()=>C.parseImport('x'.repeat(10*1024*1024+1)));
 assert.throws(()=>C.parseImport(JSON.stringify({schemaVersion:99,state})));
 assert.throws(()=>C.parseImport('{'));
});
test('corrupted save never silently resets; backup is bounded and nonrecursive; quota failures are surfaced',()=>{
 const store=memory();store.setItem(C.KEY,'{');const loaded=C.load(store);assert.equal(loaded.state,null);assert.equal(store.getItem(C.KEY),'{');
 for(let i=0;i<5;i++)C.backup(store,C.createState());
 const backups=JSON.parse(store.getItem(C.BACKUP_KEY));assert.equal(backups.length,3);assert.equal(backups[0].state.backups,undefined);
 assert.throws(()=>C.save({setItem(){throw Error('quota')}},C.createState()),/сохранить/);
});
test('merge is idempotent and preserves current profile and current draft',()=>{
 const a=C.createState(),b=C.createState();a.profile.name='Текущий';b.profile.name='Входящий';
 a.journal=[{at:'2026-09-18',note:'без ID'}];b.journal=structuredClone(a.journal);b.journal.push({id:'j2',at:'2026-09-18',note:'новая'});
 a.lessonWork.L01={fields:{'recall-0':'Моя версия'},revealed:[],step:'recall'};b.lessonWork.L01={fields:{'recall-0':'Другая'},revealed:[],step:'read'};
 const merged=C.mergeState(a,b);assert.equal(merged.journal.length,2);assert.equal(merged.profile.name,'Текущий');assert.equal(merged.lessonWork.L01.fields['recall-0'],'Моя версия');
 assert.deepEqual(C.mergeState(merged,b),merged);
});
test('snapshots are detached from updated question keys and repeat attempts remain separate',()=>{
 const q=question(),s=C.createState();s.attempts=[attempt(q),attempt(q,{id:'b',answer:[0],correct:false})];const store=memory();C.save(store,s);q.correct[0]=0;
 const restored=C.load(store).state;assert.equal(restored.attempts.length,2);assert.deepEqual(restored.attempts[0].questionSnapshot.correct,[1]);
});

test('merge fills an already opened empty lesson, preserves filled fields and earlier review',()=>{
 const a=C.createState(),b=C.createState();
 a.lessonWork.L01={fields:{'recall-0':'','recall-1':'Текущий ответ'},revealed:[]};
 b.lessonWork.L01={fields:{'recall-0':'Восстановленный ответ','recall-1':'Старая версия','case-0':'Кейс'},revealed:['case-analysis']};
 a.reviews.c={dueAt:'2026-10-10',intervalDays:14};b.reviews.c={dueAt:'2026-09-20',intervalDays:1};
 const merged=C.mergeState(a,b);assert.equal(merged.lessonWork.L01.fields['recall-0'],'Восстановленный ответ');assert.equal(merged.lessonWork.L01.fields['recall-1'],'Текущий ответ');assert.equal(merged.lessonWork.L01.fields['case-0'],'Кейс');assert.deepEqual(merged.lessonWork.L01.revealed,['case-analysis']);assert.equal(merged.reviews.c.intervalDays,1);
 assert.deepEqual(C.mergeState(merged,b),merged);
});

test('readiness orders actual timestamps after merge, ignoring storage array order',()=>{
 const q=question();const early=attempt(q,{id:'early',answeredAt:'2026-09-17T10:00:00Z',correct:false});
 const late=attempt(q,{id:'late',answeredAt:'2026-09-18T10:00:00Z',correct:true});
 assert.equal(C.readiness([q],[late,early]).correct,0);
 assert.equal(C.readiness([q],[{...early,correct:true}, {...late,correct:false}]).correct,1);
 assert.equal(C.readiness([q],[late,{...early,assisted:true}]).eligible,0);
});

test('training totals require a valid completed date, confirmation and no future completion',()=>{
 const records=[{hours:35,date:'2026-09-01',confirmed:true},{hours:100,date:'2027-01-01',confirmed:true},{hours:20,date:'2026-02-30',confirmed:true},{hours:10,confirmed:true},{hours:5,date:'2026-09-01',confirmed:false}];
 assert.equal(C.countTrainingHours(records,'2026-09-18'),35);
 const s=C.createState();s.training=[{title:'Bad',hours:20,date:'2026-02-30',confirmed:true}];assert.throws(()=>C.validateState(s));
});
test('exact multiselect and ordered matching; numeric decimal comma, tolerance and nonfinite values',()=>{
 assert.equal(C.grade({type:'multi',correct:[1,3]},[3,1]),true);for(const x of [[],[1],[1,1],[1,3,2]])assert.equal(C.grade({type:'multi',correct:[1,3]},x),false);
 assert.equal(C.grade({type:'matching',correct:[2,0,1]},[2,0,1]),true);assert.equal(C.grade({type:'matching',correct:[2,0,1]},[0,2,1]),false);
 assert.equal(C.grade({type:'numeric',answer:.8,tolerance:.005},'0,80'),true);for(const x of ['','Infinity','NaN','0.8.0','1/2'])assert.equal(C.grade({type:'numeric',answer:.8,tolerance:.005},x),false);
});
test('experience unions months, respects rolling 120-month window, excludes drafts and future',()=>{
 const r=[{confirmed:true,start:'2016-01',end:'2016-11'},{confirmed:true,start:'2026-01',end:'2026-06'},{confirmed:true,start:'2026-04',end:'2026-11'},{confirmed:false,start:'2020-01',end:'2020-12'}];
 assert.equal(C.countExperienceMonths(r,'2026-09-18'),11);
 assert.throws(()=>C.countExperienceMonths([{confirmed:true,start:'2026-03',end:'2026-01'}]));
});
test('review intervals and timer survive serialization and elapsed wall-clock time',()=>{
 let review=null;for(const days of [1,3,7,14,30]){review=C.nextReview(review,true,3,false,'2026-09-18');assert.equal(review.intervalDays,days);}
 assert.equal(C.nextReview(review,true,3,true,'2026-09-18').intervalDays,1);
 const s=JSON.parse(JSON.stringify({deadline:'2026-09-18T12:10:00Z'}));assert.equal(C.remainingSeconds(s,'2026-09-18T12:04:30Z'),330);assert.equal(C.remainingSeconds(s,'2026-09-18T12:10:01Z'),0);
});
test('largest-remainder blueprint quotas allocate all 180 slots and never reuse family across domains',()=>{
 const domains=['People','Process','Business Environment'];
 const bank=domains.flatMap(d=>Array.from({length:100},(_,i)=>question(d+i,d)));
 const chosen=C.selectQuestions(bank,[],180,{People:33,Process:41,'Business Environment':26});
 assert.equal(chosen.questions.length,180);assert.deepEqual(chosen.byDomain,{People:59,Process:74,'Business Environment':47});
 assert.equal(new Set(chosen.questions.map(q=>q.scenarioFamilyId)).size,180);
 const small=[question('p','People','shared'),question('p2','People','other'),question('r','Process','shared')];
 const cross=C.selectQuestions(small,[],2,{People:50,Process:50});assert.equal(cross.questions.length,2);assert.equal(new Set(cross.questions.map(q=>q.scenarioFamilyId)).size,2);
 bank[0].status='quarantined';bank[1].status='draft';const fresh=C.selectQuestions(bank,[bank[2].scenarioFamilyId],3,{People:100});assert(fresh.questions.every(q=>!bank.slice(0,3).includes(q)&&!['People0','People1','People2'].includes(q.id)));
});
test('readiness cannot increase by repeating a hinted or failed question',()=>{
 const q=question(),bank=[q];assert.equal(C.readiness(bank,[attempt(q,{assisted:true}),attempt(q,{id:'second'})]).eligible,0);
 assert.equal(C.readiness(bank,[attempt(q,{correct:false}),attempt(q,{id:'second'})]).correct,0);
 q.status='automatically_checked';assert.equal(C.readiness(bank,[attempt(q)]).eligible,0);
});
