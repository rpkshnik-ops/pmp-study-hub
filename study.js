/* Content presentation and session snapshots. No network or model calls. */
(function(root){
  'use strict';
  const approved=q=>['model_reviewed','expert_reviewed'].includes(q.status);
  function shuffledIndices(count,random=Math.random){
    const order=Array.from({length:count},(_,i)=>i);
    for(let i=count-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    return order;
  }
  function prepareQuestion(question,random=Math.random){
    const q=JSON.parse(JSON.stringify(question));
    if(q.type==='single'||q.type==='multi'){
      const order=shuffledIndices(q.options.length,random),correct=new Set(q.correct);
      q.options=order.map(i=>question.options[i]);
      q.explanations=order.map(i=>question.explanations[i]);
      q.correct=order.flatMap((source,index)=>correct.has(source)?[index]:[]);
    }else if(q.type==='matching'){
      const order=shuffledIndices(q.right.length,random);
      q.right=order.map(i=>question.right[i]);q.correct=question.correct.map(i=>order.indexOf(i));
    }
    return q;
  }
  function questions(lessons){
    return lessons.flatMap(l=>l.questions.map(q=>({...q,lessonId:l.id,
      ...(q.caseId&&l.caseStudy?.id===q.caseId?{stimulus:l.caseStudy}:{})})));
  }
  function available(bank,state){
    const rejected=new Set(state.quarantined.map(x=>x.questionId));
    const families=new Set(bank.filter(q=>rejected.has(q.id)).map(q=>q.scenarioFamilyId));
    for(const q of bank.filter(q=>q.caseId)){
      const members=bank.filter(m=>m.scenarioFamilyId===q.scenarioFamilyId);
      if(members.length!==3||members.some(m=>!approved(m)||m.caseId!==q.caseId)||members.map(m=>m.casePosition).sort().join(',')!=='1,2,3')families.add(q.scenarioFamilyId);
    }
    return bank.filter(q=>approved(q)&&!families.has(q.scenarioFamilyId));
  }
  function caseQuestions(bank,lessonId){
    return bank.filter(q=>q.lessonId===lessonId&&q.caseId).sort((a,b)=>a.casePosition-b.casePosition);
  }
  function labKey(lesson){return 'lab-v'+lesson.version+'-';}
  function wasSeen(question,state){
    return state.exposures.some(x=>x.id===question.scenarioFamilyId)||state.attempts.some(a=>a.questionId===question.id||a.questionSnapshot?.scenarioFamilyId===question.scenarioFamilyId);
  }
  function missingSnapshot(session){
    const id=session.questionIds[session.index];
    return !session.questionSnapshots?.[id]&&(session.draftAnswers[id]!==undefined||!!session.started[id])&&!session.responseIds[session.index];
  }
  const api={prepareQuestion,questions,available,caseQuestions,labKey,wasSeen,missingSnapshot};
  root.PMPStudy=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
