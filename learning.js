/* Learning decisions are pure functions, independent of storage and the DOM. */
(function(root){
  'use strict';
  const approved=q=>['model_reviewed','expert_reviewed'].includes(q.status);
  const dateValue=value=>Number.isFinite(Date.parse(value))?Date.parse(value):0;
  function dayKey(now=new Date()){
    const d=new Date(now);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  }
  function cycleKey(now=new Date()){
    const d=new Date(now);d.setDate(d.getDate()-(d.getDay()+6)%7);return dayKey(d);
  }
  function prefix(mode,now){return 'plan-'+mode+'-'+(mode==='foundation'?'all':cycleKey(now))+'-';}
  function tasks(lesson,mode='foundation'){
    const all=[
      {id:'lesson',title:'Разобраться в понятиях и объяснить принцип',minutes:35,step:'read',instructions:[lesson.objectives[0],'8 мин: изучите понятия; 4 мин: проследите разобранный пример; 8 мин: ответьте на три вопроса шага «Вспомнить» без текста.','10 мин: сравните с объяснением и исправьте одну неточность; 5 мин: объясните ключевые термины своими словами. Кейс, документ и тест можно пройти в следующих блоках недели.'],result:'Три ответа своими словами и исправленная неточная формулировка.'},
      {id:'recall',title:'Восстановить принцип и найти границы',minutes:35,step:'recall',instructions:[...lesson.recall.prompts,'Придумайте собственный пример и контрпример. Объясните, какой факт меняет выбор. Затем сравните с уроком и исправьте одну неточность.'],result:'Объяснение своими словами, контрпример и исправление.'},
      {id:'transfer',title:'Защитить решение в другой отрасли',minutes:35,step:'case',instructions:[lesson.transferCase.context,...lesson.transferCase.prompts,'Сначала запишите решение. После разбора объясните, почему отвергнутый вами вариант хуже именно при этих условиях.'],result:'Решение кейса, отвергнутая альтернатива и условие пересмотра.'},
      lesson.lab?{id:'challenge',title:'Решить практикум с исходными данными',minutes:35,step:'lab',instructions:[lesson.lab.objective,...lesson.lab.steps,'Запишите решение по таблице, проверьте расчёты и отметьте доказательства по каждому критерию.'],result:'Решение по данным, обоснованная альтернатива и самопроверка.'}:{id:'challenge',title:'Изменить условие и пересмотреть решение',minutes:35,step:'case',instructions:[lesson.stretch.prompt,'Сравните два варианта: что выигрываем, чем рискуем, кто вправе выбирать? Назовите недостающий факт и способ его проверить.'],result:'Два варианта, критерий выбора и проверяемое допущение.'},
      {id:'apply',title:'Применить инструмент к своему проекту',minutes:100,step:'artifact',instructions:['15 мин: выберите реальный или учебный проект и опишите цель и ограничения.','35 мин: подготовьте документ «'+lesson.artifact.title+'». '+lesson.artifact.instructions,'30 мин: проверьте документ при изменении одного ограничения — срока, ресурса или требования. Запишите последствия и решение.','20 мин: сверка с рубрикой. '+lesson.artifact.rubric.join(' ')],result:'Документ, след изменения и конкретный следующий шаг на работе.'},
      {id:'review',title:'Проверить удержание и подвести итог',minutes:60,step:'check',instructions:['По возможности вернитесь через 7 дней. 15 мин: восстановите ключевые понятия без текста и повторите карточки.','20 мин: решите ещё не отвеченные вопросы темы; при повторе отметьте, что узнавание ответа не равно новой проверке.','15 мин: разберите одну ошибку или сомнение и объясните, какой факт меняет правильное действие.','10 мин: запишите, что применили, что пока не получилось и что сделаете на следующей неделе.'],result:'Итог недели с ошибкой, исправлением и следующим действием.'}
    ];
    if(mode==='practice')return all.filter(x=>['recall','transfer','apply','review'].includes(x.id)).map(x=>({...x,minutes:{recall:15,transfer:25,apply:60,review:20}[x.id],instructions:x.id==='apply'?[lesson.artifact.instructions,'Примените один раздел документа на работе, затем зафиксируйте наблюдаемый результат и ограничение.']:x.id==='review'?['Повторите назначенные карточки. Объясните одну прежнюю ошибку без разбора и обновите журнал практики.']:x.instructions}));
    if(mode==='intensive')return all.filter(x=>['recall','challenge','review'].includes(x.id)).map(x=>({...x,minutes:{recall:25,challenge:35,review:30}[x.id],instructions:x.id==='review'?['Решите ещё не открытые вопросы выбранной слабой темы. Если новых нет, повторите её как тренировку и отметьте ограниченность банка.','Изучите ошибки только после собственной попытки; затем составьте план повторения. Полный пробник требует отдельного проверенного резерва.']:x.instructions}));
    return all;
  }
  function isDone(state,lesson,task,mode,now){
    if(mode==='foundation'&&task.id==='lesson'&&state.completedLessons.includes(lesson.id))return true;
    return dateValue(state.lessonWork[lesson.id]?.fields[taskKey(lesson,task,mode,now)+'-done'])>0;
  }
  function taskKey(lesson,task,mode,now){return prefix(mode,now)+(lesson.lab&&task.id==='challenge'?'v'+lesson.version+'-':'')+task.id;}
  function week(lesson,state,now=new Date()){
    const mode=state.settings.mode,items=tasks(lesson,mode).map(t=>({...t,done:isDone(state,lesson,t,mode,now),key:taskKey(lesson,t,mode,now)}));
    const remaining=items.filter(x=>!x.done).reduce((sum,x)=>sum+x.minutes,0),budget=Math.max(30,Math.round(state.profile.hours*60));
    return {items,remaining,budget,weeks:Math.ceil(remaining/budget),total:items.reduce((sum,x)=>sum+x.minutes,0),done:items.filter(x=>x.done).length};
  }
  function statistics(lessons,state){
    const quarantined=new Set(state.quarantined.map(x=>x.questionId));
    const all=lessons.flatMap(l=>l.questions.map(q=>({...q,lessonId:l.id}))),excludedFamilies=new Set(all.filter(q=>quarantined.has(q.id)).map(q=>q.scenarioFamilyId));
    for(const q of all.filter(q=>q.caseId)){
      const members=all.filter(m=>m.scenarioFamilyId===q.scenarioFamilyId);
      if(members.length!==3||members.some(m=>!approved(m)||m.caseId!==q.caseId)||members.map(m=>m.casePosition).sort().join(',')!=='1,2,3')excludedFamilies.add(q.scenarioFamilyId);
    }
    const bank=all.filter(q=>approved(q)&&!excludedFamilies.has(q.scenarioFamilyId));
    const byId=new Map(bank.map(q=>[q.id,q])),seen=new Set(),first=[],helped=[],repeated=[];
    const pending=new Set([state.sessions.quiz,...Object.values(state.sessions.saved||{})].filter(s=>s&&!s.finished&&['timed','case','diagnostic'].includes(s.kind)).flatMap(s=>s.responseIds||[]));
    const attempts=state.attempts.filter(a=>!pending.has(a.id)).sort((a,b)=>dateValue(a.answeredAt)-dateValue(b.answeredAt)||a.id.localeCompare(b.id));
    const pendingFamilies=new Set(),previousVersions=new Set();
    for(const a of attempts){
      const q=byId.get(a.questionId);if(!q)continue;
      if(q.version!==a.questionVersion){previousVersions.add(q.scenarioFamilyId);continue;}
      if(seen.has(q.scenarioFamilyId))continue;
      let evidence=[a],earlierCaseAttempt=false;
      if(q.caseId){
        const members=bank.filter(x=>x.scenarioFamilyId===q.scenarioFamilyId);
        evidence=members.map(member=>attempts.find(x=>x.sessionId&&x.sessionId===a.sessionId&&x.questionId===member.id&&x.questionVersion===member.version));
        if(evidence.some(x=>!x)){pendingFamilies.add(q.scenarioFamilyId);continue;}
        const firstTime=Math.min(...evidence.map(x=>dateValue(x.answeredAt)));
        earlierCaseAttempt=attempts.some(x=>x.sessionId!==a.sessionId&&members.some(m=>m.id===x.questionId)&&dateValue(x.answeredAt)<=firstTime);
        pendingFamilies.delete(q.scenarioFamilyId);
      }
      seen.add(q.scenarioFamilyId);
      const help=state.exposures.find(x=>x.id===q.scenarioFamilyId)?.helpAt;
      const entry={...a,correct:evidence.every(x=>x.correct),confidence:Math.min(...evidence.map(x=>x.confidence)),lessonId:q.lessonId,domain:q.eco.domain};
      if(evidence.some(x=>x.assisted)||(help&&dateValue(help)<=Math.max(...evidence.map(x=>dateValue(x.answeredAt)))))helped.push(entry);else if(previousVersions.has(q.scenarioFamilyId)||earlierCaseAttempt||evidence.some(x=>x.priorExposure))repeated.push(entry);else first.push(entry);
    }
    const summary=entries=>({n:entries.length,correct:entries.filter(a=>a.correct).length,uncertain:entries.filter(a=>a.confidence<3).length,score:entries.length?Math.round(entries.filter(a=>a.correct).length*100/entries.length):null});
    return {overall:summary(first),helped:helped.length,repeated:repeated.length,pendingCases:pendingFamilies.size,first,
      domains:['People','Process','Business Environment'].map(id=>({id,...summary(first.filter(a=>a.domain===id))})),
      topics:lessons.map(l=>{const entries=first.filter(a=>a.lessonId===l.id),s=summary(entries);return {id:l.id,...s,helped:helped.filter(a=>a.lessonId===l.id).length,priority:entries.filter(a=>!a.correct).length*3+s.uncertain,completed:state.completedLessons.includes(l.id)};})};
  }
  function selectLesson(lessons,state,now=new Date()){
    if(state.settings.mode==='foundation')return lessons.find(l=>week(l,state,now).remaining>0)||null;
    const pinned=state.settings.studyWeek;
    if(pinned?.mode===state.settings.mode&&pinned.cycle===cycleKey(now)){
      const lesson=lessons.find(l=>l.id===pinned.lessonId);
      if(lesson)return week(lesson,state,now).remaining>0?lesson:null;
    }
    const report=statistics(lessons,state);
    const candidates=report.topics.filter(t=>week(lessons.find(l=>l.id===t.id),state,now).remaining>0);
    candidates.sort((a,b)=>b.priority-a.priority||b.helped-a.helped||Number(b.completed)-Number(a.completed)||a.id.localeCompare(b.id));
    return lessons.find(l=>l.id===candidates[0]?.id)||null;
  }
  function freshQuestions(lessons,state,count=10){
    const all=lessons.flatMap(l=>l.questions),byId=new Map(all.map(q=>[q.id,q]));
    const seen=new Set([...state.exposures.map(x=>x.id),...state.attempts.flatMap(a=>[a.questionSnapshot?.scenarioFamilyId,byId.get(a.questionId)?.scenarioFamilyId]).filter(Boolean)]),blocked=new Set(state.quarantined.map(x=>x.questionId));
    const pool=all.filter(q=>approved(q)&&!q.reserve&&!q.caseId&&!seen.has(q.scenarioFamilyId)&&!blocked.has(q.id));
    const queues=['People','Process','Business Environment'].map(d=>pool.filter(q=>q.eco.domain===d)),result=[];
    while(result.length<count&&queues.some(q=>q.length)){for(const queue of queues){const q=queue.shift();if(q&&!seen.has(q.scenarioFamilyId)&&result.length<count){result.push(q);seen.add(q.scenarioFamilyId);}}}
    return result;
  }
  function dueCards(cards,state,now=new Date()){
    return cards.filter(c=>state.reviews[c.id]&&dateValue(state.reviews[c.id].dueAt)<=new Date(now).getTime()).sort((a,b)=>dateValue(state.reviews[a.id].dueAt)-dateValue(state.reviews[b.id].dueAt));
  }
  function recommend(lessons,cards,state,now=new Date()){
    const lesson=selectLesson(lessons,state,now),active=state.sessions.quiz;
    if(active&&!active.finished&&(!active.deadline||dateValue(active.deadline)>new Date(now).getTime()))return {href:'#practice?session=active',title:'Продолжить начатую тренировку',reason:'Ваши ответы и выбранный порядок вопросов сохранены.',minutes:10,lesson};
    if(dueCards(cards,state,now).length&&reviewedToday(state,now)<5)return {href:'#review',title:'Вспомнить изученное',reason:'Подошло время назначенных карточек. Начните с пяти и затем вернитесь к плану.',minutes:10,lesson};
    if(!lesson)return {href:'#progress',title:'Подвести итог и выбрать следующий режим',reason:state.settings.mode==='foundation'?'Все задания маршрута отмечены. Проверьте слабые темы и план поддержания.':'План текущей календарной недели выполнен. Можно повторить трудную тему или отдохнуть.',minutes:10,lesson:null};
    const task=week(lesson,state,now).items.find(t=>!t.done);
    return {href:task.id==='lesson'?'#lesson?id='+lesson.id+'&step='+(state.lessonWork[lesson.id]?.step||'read'):'#week?id='+lesson.id+'&task='+task.id,title:task.title,reason:state.settings.mode==='foundation'?'Это следующий незавершённый шаг темы «'+lesson.title+'».': 'Выбрана тема с ошибками или сомнениями; при отсутствии попыток — первая доступная тема.',minutes:task.minutes,lesson};
  }
  function reviewedToday(state,now=new Date()){return Object.values(state.reviews).filter(r=>r.lastReviewedDay===dayKey(now)).length;}
  const api={dayKey,cycleKey,prefix,tasks,week,statistics,selectLesson,dueCards,recommend,freshQuestions,reviewedToday};
  root.PMPLearning=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
