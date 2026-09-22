const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../core.js'),L=require('../learning.js');
const lessons=Array.from({length:6},(_,i)=>JSON.parse(fs.readFileSync(path.join(__dirname,'..','content',`pack-${String(i+1).padStart(2,'0')}.json`),'utf8'))).flatMap(p=>p.lessons);
const now='2026-09-22T12:00:00Z';
const markAll=(state,lesson)=>{const f=(state.lessonWork[lesson.id]||={fields:{},revealed:[]}).fields;for(const task of L.week(lesson,state,now).items)f[task.key+'-done']=now;};
const attempt=(q,extra={})=>({id:'a',questionId:q.id,questionVersion:q.version,questionSnapshot:q,answer:q.correct||q.answer,correct:true,confidence:3,assisted:false,answeredAt:now,elapsedSeconds:5,...extra});

test('all 24 topics have actual 300-minute activities; budget extends time instead of deleting work',()=>{
 for(const lesson of lessons){const state=C.createState(),plan=L.week(lesson,state,now);assert.equal(plan.total,300);assert.deepEqual(plan.items.map(t=>t.minutes),[35,35,35,35,100,60]);assert.equal(plan.weeks,1);assert.ok(plan.items.find(t=>t.id==='apply').instructions.some(x=>x.includes(lesson.artifact.title)));state.profile.hours=2;assert.equal(L.week(lesson,state,now).weeks,3);}
});
test('old lesson completion is retained but does not silently complete a week',()=>{
 const state=C.createState();state.completedLessons=['L01'];assert.equal(L.week(lessons[0],state,now).done,1);assert.equal(L.selectLesson(lessons,state,now).id,'L01');markAll(state,lessons[0]);assert.equal(L.selectLesson(lessons,state,now).id,'L02');
 const migrated=C.parseImport(JSON.stringify({schemaVersion:2,state}));assert.equal(L.week(lessons[0],migrated,now).remaining,0);
});
test('finished foundation has an explicit next stage, never wraps to L01',()=>{
 const state=C.createState();lessons.forEach(l=>markAll(state,l));assert.equal(L.selectLesson(lessons,state,now),null);assert.equal(L.recommend(lessons,[],state,now).href,'#progress');
});
test('maintenance and intensive plans change activities and renew weekly without deleting past notes',()=>{
 const state=C.createState();state.settings.mode='practice';assert.equal(L.week(lessons[0],state,now).total,120);assert.equal(L.week(lessons[0],state,now).items.length,4);markAll(state,lessons[0]);assert.equal(L.week(lessons[0],state,now).remaining,0);assert.equal(L.week(lessons[0],state,'2026-09-29T12:00:00Z').remaining,120);state.settings.mode='intensive';assert.equal(L.week(lessons[0],state,now).total,90);assert.equal(L.week(lessons[0],state,now).items.length,3);
});
test('one pinned maintenance topic completes a week; it does not assign all 24 topics',()=>{
 const state=C.createState();state.settings.mode='practice';state.settings.studyWeek={mode:'practice',cycle:L.cycleKey(now),lessonId:'L08'};
 assert.equal(L.selectLesson(lessons,state,now).id,'L08');markAll(state,lessons[7]);assert.equal(L.selectLesson(lessons,state,now),null);assert.equal(L.recommend(lessons,[],state,now).href,'#progress');assert.ok(L.selectLesson(lessons,state,'2026-09-29T12:00:00Z'));
});
test('five reviews today return priority to the plan while leaving due cards available',()=>{
 const state=C.createState();state.reviews.due={dueAt:'2026-09-01',intervalDays:1};
 for(let i=0;i<5;i++)state.reviews['done'+i]={dueAt:'2026-10-01',intervalDays:7,lastReviewedDay:L.dayKey(now)};
 assert.equal(L.reviewedToday(state,now),5);assert.notEqual(L.recommend(lessons,[{id:'due'}],state,now).href,'#review');assert.equal(L.dueCards([{id:'due'}],state,now).length,1);
 assert.equal(L.recommend(lessons,[{id:'due'}],state,'2026-09-23T12:00:00Z').href,'#review');
});
test('recommendation resumes active work, then due cards, then plan; weak topics guide maintenance',()=>{
 const state=C.createState(),q=lessons[7].questions[0];state.attempts=[attempt(q,{correct:false})];state.settings.mode='practice';assert.equal(L.selectLesson(lessons,state,now).id,'L08');state.reviews.c={dueAt:'2026-09-01',intervalDays:1};assert.equal(L.recommend(lessons,[{id:'c'}],state,now).href,'#review');state.sessions.quiz={finished:false,deadline:'2026-09-22T13:00:00Z'};assert.equal(L.recommend(lessons,[{id:'c'}],state,now).href,'#practice?session=active');
});
test('first-answer statistics exclude help, already exposed attempts, obsolete versions and quarantine',()=>{
 const state=C.createState(),q=lessons[0].questions[0];state.attempts=[attempt(q,{id:'late',answeredAt:'2026-09-22T13:00:00Z'}),attempt(q,{id:'early',answeredAt:'2026-09-22T10:00:00Z',correct:false})];assert.equal(L.statistics(lessons,state).overall.correct,0);state.attempts[1].priorExposure=true;assert.equal(L.statistics(lessons,state).overall.n,0);assert.equal(L.statistics(lessons,state).repeated,1);state.attempts[1].priorExposure=false;state.exposures=[{id:q.scenarioFamilyId,questionId:q.id,helpAt:'2026-09-22T09:00:00Z'}];assert.equal(L.statistics(lessons,state).helped,1);state.exposures[0].helpAt='2026-09-22T11:00:00Z';assert.equal(L.statistics(lessons,state).overall.n,1);state.quarantined=[{questionId:q.id}];assert.equal(L.statistics(lessons,state).overall.n,0);state.quarantined=[];state.attempts=state.attempts.map(a=>({...a,questionVersion:1}));assert.equal(L.statistics(lessons,state).overall.n,0);
});
test('fresh practice spans domains without recycling exposed or quarantined families',()=>{
 const state=C.createState();const first=L.freshQuestions(lessons,state);assert.equal(first.length,10);assert.equal(new Set(first.map(q=>q.eco.domain)).size,3);assert.equal(new Set(first.map(q=>q.scenarioFamilyId)).size,10);state.exposures=[{id:first[0].scenarioFamilyId,questionId:first[0].id}];state.quarantined=[{questionId:first[1].id}];const next=L.freshQuestions(lessons,state);assert.ok(next.every(q=>q.id!==first[0].id&&q.id!==first[1].id));
});
