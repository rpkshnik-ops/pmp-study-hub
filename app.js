/* UI layer. Content lives in JSON packs; persistence and scoring live in core.js. */
'use strict';
(() => {
  const C = globalThis.PMPCore, L = globalThis.PMPLearning, S = globalThis.PMPStudy, config = globalThis.PMPConfig;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => crypto.randomUUID();
  const now = () => new Date().toISOString();
  const paragraphs = lines => lines.map(line => '<p>'+esc(line)+'</p>').join('');
  const list = (items, ordered = false) => '<'+(ordered?'ol':'ul')+' class="steps">'+items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</'+(ordered?'ol':'ul')+'>';
  const steps = [['read','Понятия','В своём темпе'],['example','Разобранный пример','Проследить решение'],['recall','Вспомнить','Без конспекта'],['case','Новая ситуация','Перенести принцип'],['artifact','Применить','Рабочий документ'],['lab','Практикум с данными','Отдельный блок · ~35 мин'],['check','Проверить','Вопросы и итог']];
  const modes = {foundation:'Фундамент — 24 недели',practice:'Практика и поддержание',intensive:'Экзаменационный интенсив'};
  let state, lessons=[], questions=[], cards=[], stale=false, persistenceError=false, pendingImport, timer;
  let currentRoute={name:'today',params:new URLSearchParams()}, waitingWorker,reviewExtra=0;
  const getLesson = id => lessons.find(l=>l.id===id);
  const getQuestion = id => questions.find(q=>q.id===id);
  const sessionQuestion = s => s.questionSnapshots?.[s.questionIds[s.index]] || getQuestion(s.questionIds[s.index]);
  const lessonUrl = (id,step='read') => '#lesson?id='+id+'&step='+step;
  const work = id => state.lessonWork[id] ||= {step:'read',fields:{},revealed:[],confidence:''};
  const eligibleBank = () => S.available(questions,state);
  const deferred = s => ['timed','case','diagnostic','exam'].includes(s.kind);
  const hiddenAttempts = () => new Set([state.sessions.quiz,...Object.values(state.sessions.saved||{})].filter(s=>s&&!s.finished&&deferred(s)).flatMap(s=>s.responseIds||[]));
  function scheduleMistake(a){
    if(!a.correct)cards.filter(c=>c.lessonId===a.questionSnapshot.lessonId).forEach(c=>state.reviews[c.id]=C.nextReview(state.reviews[c.id],false,a.confidence,false));
  }
  function finishSession(s){
    if(s.finished)return;
    s.finished=true;
    if(deferred(s))s.responseIds.map(id=>state.attempts.find(a=>a.id===id)).filter(Boolean).forEach(scheduleMistake);
  }
  function dataTable(table){
    if(!table)return '';
    return '<div class="table-scroll" role="region" aria-label="'+esc(table.caption)+'" tabindex="0"><table class="data-table"><caption>'+esc(table.caption)+'</caption><thead><tr>'+table.columns.map(c=>'<th scope="col">'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+table.rows.map(row=>'<tr>'+row.map((cell,i)=>'<'+(i===0?'th scope="row"':'td')+'>'+esc(cell)+'</'+(i===0?'th':'td')+'>').join('')+'</tr>').join('')+'</tbody></table></div>';
  }
  function chart(data){
    if(!data)return '';
    const max=Math.max(1,...data.values),height=70+data.labels.length*42;
    return '<figure class="data-chart"><figcaption>'+esc(data.title)+' · '+esc(data.unit)+'</figcaption><svg role="img" aria-label="'+esc(data.title)+'" viewBox="0 0 640 '+height+'"><desc>Столбцы начинаются от нуля. Значения также приведены в таблице.</desc>'+data.labels.map((label,i)=>{const y=32+i*42;return '<text x="5" y="'+(y+19)+'">'+esc(label)+'</text><rect x="180" y="'+y+'" width="'+(data.values[i]/max*350)+'" height="26"></rect><text x="'+(188+data.values[i]/max*350)+'" y="'+(y+19)+'">'+esc(data.values[i])+'</text>';}).join('')+'<line x1="180" y1="20" x2="180" y2="'+(height-20)+'"></line><text x="176" y="'+(height-2)+'">0</text></svg></figure>';
  }
  function stimulus(data){return data?'<section class="case-context"><h2>'+esc(data.title)+'</h2><p>'+esc(data.context)+'</p>'+dataTable(data.table)+chart(data.chart)+'</section>':'';}
  function notice(message) { $('#notice').textContent=message; $('#notice').hidden=!message; }
  function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('show'); setTimeout(()=>$('#toast').classList.remove('show'),3000); }
  function persist() {
    if(stale) { notice('Данные изменены в другой вкладке. Экспортируйте текущие ответы при необходимости и перезагрузите страницу перед продолжением.'); return false; }
    try { C.save(localStorage,state); persistenceError=false; document.querySelectorAll('.save-status').forEach(el=>el.textContent='Ответы сохранены на этом устройстве'); return true; }
    catch(error) { persistenceError=true; notice(error.message+'. Сделайте экспорт в настройках; текущие ответы остаются в открытой вкладке.'); return false; }
  }
  function formatDate(value) { const d=new Date(value);return Number.isNaN(d.getTime())?'не указана':d.toLocaleDateString('ru-RU'); }
  function sourceLinks(refs) {
    return '<ul class="source-list">'+refs.map(ref=>{
      const source=config.sources[ref.id]; return '<li>'+(source?'<a href="'+esc(source.url)+'" target="_blank" rel="noopener noreferrer">'+esc(source.title)+'</a>':esc(ref.id))+' — '+esc(ref.section)+'</li>';
    }).join('')+'</ul>';
  }
  function lessonCard(l) { const done=state.completedLessons.includes(l.id);return '<article class="card"><p class="eyebrow">Неделя '+l.week+' · '+esc(l.approach)+'</p><h2><a href="'+lessonUrl(l.id,work(l.id).step)+'">'+esc(l.title)+'</a></h2><p>'+esc(l.objectives[0])+'</p><span class="badge">'+(done?'Основной урок пройден':'Основы и самостоятельная практика')+'</span>'+(l.lab?'<p><a href="'+lessonUrl(l.id,'lab')+'">Практикум: '+esc(l.lab.title)+'</a></p>':'')+'</article>'; }
  function savedField(lid,key,label,placeholder='') { return '<label>'+esc(label)+'<textarea maxlength="5000" data-work="'+lid+'" data-field="'+esc(key)+'" placeholder="'+esc(placeholder)+'">'+esc(work(lid).fields[key]||'')+'</textarea></label>'; }
  function reveal(lid,key,label,body) {
    const opened=work(lid).revealed.includes(key);
    return '<details data-reveal="'+key+'" data-lesson="'+lid+'"'+(opened?' open':'')+'><summary>'+esc(label)+'</summary>'+body+'</details>';
  }
  function pageHeading(eyebrow,title,description='') { return '<p class="eyebrow">'+esc(eyebrow)+'</p><h1>'+esc(title)+'</h1>'+(description?'<p class="lead">'+esc(description)+'</p>':''); }
  function educationOptions(selected) { return [['unknown','Пока неизвестно'],['secondary','Среднее образование'],['associate','Квалификация уровня EQF 5 / ISCED 5'],['bachelor','Бакалавр или эквивалент EQF 6'],['gac','Высшее по программе PMI GAC']].map(([v,t])=>'<option value="'+v+'"'+(selected===v?' selected':'')+'>'+t+'</option>').join(''); }
  function profileForm(onboarding=false) {
    const p=state.profile;
    return '<form id="profileForm" class="panel compact">'+(onboarding?'<p>Для начала учёбы достаточно нажать «Начать». Неизвестные данные можно добавить позже.</p>':'')+
    '<label>Имя (необязательно)<input name="name" maxlength="80" value="'+esc(p.name)+'"></label>'+
    '<label>Образование<select name="education">'+educationOptions(p.education)+'</select></label>'+
    '<label>Доступно часов в неделю<input name="hours" type="number" min="1" max="30" step="0.5" value="'+p.hours+'"></label>'+
    '<label>Предполагаемая дата экзамена (можно оставить пустой)<input name="examDate" type="date" value="'+esc(p.examDate)+'"></label>'+
    '<label>Предпочитаемый язык экзамена<select name="language"><option value="ru"'+(p.language==='ru'?' selected':'')+'>Русский</option><option value="en"'+(p.language==='en'?' selected':'')+'>Английский</option></select></label><p class="form-note">Стартовые уроки и вопросы — по-русски с английскими терминами. Выбор английского сохраняет предпочтение для будущих пакетов.</p>'+
    '<button type="submit">'+(onboarding?'Начать обучение':'Сохранить настройки')+'</button></form>';
  }
  function today() {
    if(!state.onboarding) return pageHeading('Первый вход','Начнём с вашей цели','Освоить управление проектами и применять его в работе — затем готовиться к PMP по мере накопления опыта.')+profileForm(true);
    const recommended=L.recommend(lessons,cards,state),next=recommended.lesson||lessons[lessons.length-1];
    const due=cards.filter(c=>state.reviews[c.id]&&new Date(state.reviews[c.id].dueAt)<=new Date());
    const stats=L.statistics(lessons,state),results={correct:stats.overall.correct,eligible:stats.overall.n},weekMinutes=Math.round(state.profile.hours*60);
    const shortHref=due.length?'#review':lessonUrl(next.id,state.completedLessons.includes(next.id)||work(next.id).step!=='read'?'recall':'read');
    return pageHeading('Сегодня',state.profile.name?'Добрый день, '+state.profile.name:'Один следующий шаг','Чтение даёт основу. Понимание проверяется объяснением, новой ситуацией и рабочим результатом.')+
    '<section class="hero"><div class="panel"><p class="eyebrow">'+esc(modes[state.settings.mode])+'</p><h2>'+esc(recommended.title)+'</h2><p>'+esc(recommended.reason)+'</p><div class="actions"><a class="button" href="'+recommended.href+'">Начать занятие</a><a class="button quiet" href="'+shortHref+'">Есть 10–15 минут</a></div><small>Ориентир: '+recommended.minutes+' минут. Длинную практику можно разбить на несколько подходов; черновик сохранится.</small></div>'+
    '<aside class="panel"><p class="eyebrow">Мой фундамент</p><div class="metric">'+state.completedLessons.length+' / 24</div><p>уроков с выполненной практикой</p><progress max="24" value="'+state.completedLessons.length+'"></progress><p>'+results.correct+' самостоятельных верных ответов из '+results.eligible+' впервые решённых проверенных сценариев.</p><a href="#progress">Слабые темы и следующий шаг</a><p><small>Это учебная статистика, не оценка допуска или вероятность сдачи PMP.</small></p></aside></section>'+
    '<div class="grid"><article class="card"><h3>Повторить</h3><p>'+due.length+' карточек из изученных тем готовы к повторению. На сегодня достаточно пяти.</p><a href="#review">Открыть повторение</a></article><article class="card"><h3>Изучить</h3><p>Бюджет недели: '+weekMinutes+' минут. При 5 часах: 4 × 35 минут, практика 100 минут и обзор 60 минут.</p><a href="#route">Настроить маршрут</a></article><article class="card"><h3>Применить</h3><p>'+esc(next.artifact.title)+'. Заполните документ на собственном или учебном проекте.</p><a href="'+lessonUrl(next.id,'artifact')+'">К мини-практике</a></article></div>';
  }
  function routePage() {
    return pageHeading('Мой маршрут','24 учебные недели и 2 резервные','Переход определяется освоением и вашей целью. Пропуск не создаёт штрафа или бесконечного долга.')+
    '<div class="callout"><h2>Мой план на неделю</h2><p>Теперь у каждой темы есть отдельные задания для объяснения, переноса и применения. Отметка о прохождении урока не закрывает всю неделю.</p><a class="button" href="#week">Открыть следующий шаг недели</a></div>'+
    '<div class="grid">'+Object.entries(modes).map(([key,label])=>'<article class="card"><h2>'+esc(label)+'</h2><p>'+({foundation:'В неделю: четыре коротких занятия, большая практика и обзор. Каждый урок можно разбить на несколько подходов.',practice:'Ориентир 1,5–2 часа: повторение, новая ситуация, применение на работе и запись опыта.',intensive:'8–12 недель ближе к выбранному экзамену: проверка правил, слабые темы и новые независимые пробники.'}[key])+'</p><button data-action="mode" data-mode="'+key+'" class="'+(state.settings.mode===key?'secondary':'')+'">'+(state.settings.mode===key?'Выбрано':'Выбрать')+'</button></article>').join('')+'</div>'+
    '<h2>Рабочие результаты по неделям</h2><div class="grid two">'+lessons.map(lessonCard).join('')+'</div>'+
    '<div class="callout">Резервные недели 25–26: закончите начатые документы, повторите трудные темы и примените один инструмент на работе. Не нужно догонять календарь ценой понимания.</div>';
  }
  function weekPage(){
    const lesson=getLesson(currentRoute.params.get('id'))||L.selectLesson(lessons,state)||getLesson(state.settings.studyWeek?.lessonId)||lessons[23],plan=L.week(lesson,state);
    const task=plan.items.find(t=>t.id===currentRoute.params.get('task'))||plan.items.find(t=>!t.done)||plan.items[0],fields=work(lesson.id).fields;
    const previousChallenge=task.id==='challenge'&&lesson.lab?fields[L.prefix(state.settings.mode)+'challengenote']:'';
    return pageHeading('Неделя '+lesson.week,lesson.title,'План — последовательность результатов. Продвигайтесь в своём темпе; пропуски не накапливают долг.')+
      '<label class="compact">Выбрать тему<select id="weekSelect">'+lessons.map(l=>'<option value="'+l.id+'"'+(l.id===lesson.id?' selected':'')+'>'+l.week+'. '+esc(l.title)+'</option>').join('')+'</select></label>'+
      '<div class="panel"><div class="inline"><b>'+plan.done+' / '+plan.items.length+' шагов выполнено</b><span>План: '+plan.total+' мин · осталось '+plan.remaining+' мин</span></div><progress value="'+plan.done+'" max="'+plan.items.length+'"></progress><p>Доступно '+plan.budget+' мин в неделю. '+(plan.weeks>1?'Оставшаяся практика рассчитана примерно на '+plan.weeks+' недели при вашем бюджете.':'Можно выполнить оставшийся объём в пределах недели.')+' Это план времени, а не измеренная длительность.</p>'+(state.settings.mode!=='foundation'?'<p>В этом режиме план начинается заново каждую календарную неделю. Предыдущие записи остаются в экспорте.</p>':'')+'</div>'+
      '<div class="lesson-shell weekly"><aside class="lesson-nav" aria-label="Шаги недели">'+plan.items.map(t=>'<a href="#week?id='+lesson.id+'&task='+t.id+'"'+(t.id===task.id?' aria-current="step"':'')+'>'+(t.done?'✓ ':'')+esc(t.title)+'<small>'+t.minutes+' мин</small></a>').join('')+'</aside>'+
      '<section class="lesson-body"><h2>'+esc(task.title)+'</h2>'+list(task.instructions,true)+'<div class="callout"><b>Результат:</b> '+esc(task.result)+'</div><p><a href="'+lessonUrl(lesson.id,task.step)+'">Открыть материал и пример по теме</a> · <a href="#review">Повторить карточки</a></p>'+
      (previousChallenge?'<details><summary>Моя работа до обновления практикума</summary><p>'+esc(previousChallenge)+'</p><p>Она сохранена. Новое задание имеет отдельную отметку.</p></details>':'')+
      savedField(lesson.id,task.key+'note','Мой результат, обоснование и следующий шаг',task.result)+
      '<label>Самопроверка<select data-work="'+lesson.id+'" data-field="'+task.key+'check"><option value="">Выберите</option><option value="yes"'+(fields[task.key+'check']==='yes'?' selected':'')+'>Сверил с критериями и отметил оставшиеся сомнения</option></select></label><p class="form-note">Это ваша самооценка. Приложение сохраняет работу, но не проверяет смысл открытого ответа автоматически.</p><button data-action="complete-week" data-id="'+lesson.id+'" data-task="'+task.id+'">'+(task.done?'Сохранить уточнения':'Отметить шаг выполненным')+'</button> <button class="quiet" data-action="export-week" data-id="'+lesson.id+'">Скачать работу недели</button><div id="weekFeedback" role="status"></div>'+(task.done?'<p class="feedback">Результат сохранён. <a href="#week?id='+lesson.id+'">К следующему незавершённому шагу</a></p>':'')+'</section></div>';
  }
  function progressPage(){
    const report=L.statistics(lessons,state),weak=report.topics.filter(t=>t.priority>0||t.helped>0).sort((a,b)=>b.priority-a.priority||b.helped-a.helped).slice(0,3);
    return pageHeading('Мой прогресс','Что получается и что повторить','Результат урока, самостоятельное решение и применение на работе — разные свидетельства обучения.')+
      '<div class="grid">'+report.domains.map(d=>'<article class="card"><h2>'+esc(d.id)+'</h2><div class="metric">'+d.correct+' / '+d.n+'</div><p>самостоятельных верных первых ответов</p><small>'+(d.n<10?'Мало данных: меньше 10 сценариев. Процент готовности не выводится.':d.score+'% на этой учебной выборке; это не прогноз результата экзамена.')+'</small></article>').join('')+'</div>'+
      '<p>Среди первых ответов: с подсказкой — '+report.helped+', после предыдущего знакомства с вопросом — '+report.repeated+'. Они, а также прежние версии и вопросы с отмеченной неоднозначностью, не повышают эти показатели.</p>'+
      '<h2>На что обратить внимание</h2>'+(weak.length?'<div class="grid">'+weak.map(t=>{const l=getLesson(t.id);return '<article class="card"><h3>'+esc(l.title)+'</h3><p>'+t.correct+' верных из '+t.n+' самостоятельных; сомнений: '+t.uncertain+'.</p><a href="#week?id='+l.id+'&task=recall">Восстановить принцип</a> · <a href="'+lessonUrl(l.id,'case')+'">Применить в ситуации</a></article>';}).join('')+'</div>':'<p>Пока нет выявленных слабых тем. Это может означать, что самостоятельных ответов ещё мало. Начните с первого урока.</p>')+
      '<h2>Темы и выполненная работа</h2><div class="table-scroll"><table><thead><tr><th scope="col">Тема</th><th scope="col">Учебная работа</th><th scope="col">Самостоятельные ответы</th><th scope="col">План</th></tr></thead><tbody>'+report.topics.map(t=>{const l=getLesson(t.id),plan=L.week(l,state),revealed=work(l.id).revealed.length;return '<tr><th scope="row"><a href="'+lessonUrl(l.id)+'">'+l.week+'. '+esc(l.title)+'</a></th><td>'+(t.completed?'Практика выполнена':'В работе')+'<br><small>открыто разборов: '+revealed+'</small></td><td>'+t.correct+' / '+t.n+'<br><small>с подсказкой: '+t.helped+'</small></td><td><a href="#week?id='+l.id+'">'+plan.done+' / '+plan.items.length+' шагов</a></td></tr>';}).join('')+'</tbody></table></div>'+
      '<p class="form-note">Количество вопросов темы ограничено. Связанный кейс считается одной ситуацией после полного решения. Открытые ответы сравнивайте с рубрикой; через 7–14 дней проверьте воспроизведение без разбора.</p>';
  }
  function library() {
    return pageHeading('Уроки и словарь','От понятия к управленческому решению','Все 24 темы доступны сразу. Для системного старта рекомендуем последовательность маршрута.')+
    coverageMap()+
    '<label class="search">Поиск по теме и термину<input id="lessonSearch" type="search" placeholder="Например, риск, scope, EVM"></label><div class="grid two" id="lessonResults">'+lessons.map(lessonCard).join('')+'</div>'+
    '<h2>Словарь с объяснениями</h2><dl class="terms">'+lessons.flatMap(l=>l.terms.map(t=>'<div><dt>'+esc(t.ru)+'<small>'+esc(t.en)+'</small></dt><dd>'+esc(t.definition)+' <a href="'+lessonUrl(l.id)+'">Урок '+l.week+'</a></dd></div>')).join('')+'</dl>';
  }
  function coverageMap(){
    const lessonLinks=ids=>[...new Set(ids)].map(id=>'<a href="'+lessonUrl(id)+'">'+esc(getLesson(id)?.title||id)+'</a>').join('; ');
    const domains=[['People',8],['Process',10],['Business Environment',8]];
    return '<details id="coverageMap"><summary>Карта курса: PMBOK 8 и задачи PMP ECO</summary><p>Это авторское сопоставление тем с публичным оглавлением PMBOK 8 и ECO от 11.08.2026. Оно помогает выбрать материал для повторения. Наличие темы или вопроса не доказывает полноту освоения и готовность к экзамену.</p>'+
      '<h2>Семь областей PMBOK 8</h2><ul class="steps">'+config.pmbokDomains.map(d=>'<li><b>'+esc(d.title)+':</b> '+lessonLinks(d.lessons)+'</li>').join('')+'</ul><p>Качество, устойчивость, ценность и лидерство рассматриваются в нескольких темах. Полный текст стандарта в курс не включён.</p>'+
      '<h2>Вопросы по задачам ECO</h2><p>Счётчики показывают текущий учебный банк. Связанные вопросы одного кейса используют общее семейство ситуаций; суммы семейств по строкам могут пересекаться.</p>'+
      domains.map(([domain,count])=>'<h3>'+esc(domain)+' · доля в экзамене '+config.blueprint.domains[domain]+'%</h3><p>В учебном банке: '+questions.filter(q=>q.eco.domain===domain).length+' из '+questions.length+' вопросов. Банк организован по темам и не воспроизводит экзаменационное распределение.</p><ol class="steps">'+Array.from({length:count},(_,i)=>{const items=questions.filter(q=>q.eco.domain===domain&&q.eco.taskId===i+1);return '<li><b>'+esc(items[0]?.eco.taskLabel||'Задача '+(i+1))+'</b><br>'+items.length+' вопросов · '+new Set(items.map(q=>q.scenarioFamilyId)).size+' семейств ситуаций<br>'+lessonLinks(items.map(q=>q.lessonId))+'</li>';}).join('')+'</ol>').join('')+
      sourceLinks([{id:'PMBOK-8-TOC',section:'Guide, section 2: Project Management Performance Domains'},{id:'PMI-ECO-2026',section:'People, Process, Business Environment: tasks 1–8 / 1–10 / 1–8'}])+'</details>';
  }
  function labBody(l){
    const lab=l.lab;if(!lab)return '<h2>Практикум готовится</h2><a href="'+lessonUrl(l.id,'artifact')+'">К рабочему документу</a>';
    const key=S.labKey(l),fields=work(l.id).fields;
    return '<h2>'+esc(lab.title)+'</h2><p class="lead">'+esc(lab.objective)+'</p><p>Это отдельное занятие с данными. Ориентир — '+lab.minutes+' минут; можно продолжить позже с сохранённого черновика.</p><p>'+esc(lab.context)+'</p>'+dataTable(lab.table)+chart(lab.chart)+
      '<h3>Порядок работы</h3>'+list(lab.steps,true)+lab.prompts.map((prompt,i)=>savedField(l.id,key+'answer-'+i,prompt,'Покажите рассуждение, данные и условие пересмотра решения.')).join('')+
      reveal(l.id,key+'solution','Сверить решение и расчёты',paragraphs(lab.solution))+
      '<h3>Проверить собственную работу</h3><p>Оцените каждый критерий по написанному ответу. Это самопроверка: приложение не оценивает смысл текста.</p>'+lab.rubric.map((rule,i)=>'<label>'+esc(rule)+'<select data-work="'+l.id+'" data-field="'+key+'criterion-'+i+'"><option value="">Выберите</option><option value="yes"'+(fields[key+'criterion-'+i]==='yes'?' selected':'')+'>В ответе есть доказательство</option><option value="revise"'+(fields[key+'criterion-'+i]==='revise'?' selected':'')+'>Нужно доработать</option></select></label>').join('')+
      '<div class="actions"><button data-action="complete-lab" data-id="'+l.id+'">Сохранить итог практикума</button><button class="secondary" data-action="export-lab" data-id="'+l.id+'">Скачать решение</button></div><p id="labFeedback" role="status">'+(fields[key+'done']?'Практикум этой версии выполнен и проверен вами. Вернитесь к нему через неделю без готового разбора.':'')+'</p>'+sourceLinks(lab.sourceRefs||[]);
  }
  function lessonPage() {
    const l=getLesson(currentRoute.params.get('id')||'L01');
    if(!l) return pageHeading('Урок не найден','Выберите тему из библиотеки')+'<a href="#lessons">К урокам</a>';
    const step=steps.some(x=>x[0]===currentRoute.params.get('step'))?currentRoute.params.get('step'):'read',w=work(l.id);
    w.step=step;persist();
    const idx=steps.findIndex(x=>x[0]===step);
    let body='';
    if(step==='read') body='<p class="lead">'+esc(l.introduction)+'</p><h2>После занятия вы сможете</h2>'+list(l.objectives)+
      '<p class="muted">Перед началом: '+esc(l.prerequisites.join('; ')||'специальные знания не нужны')+'</p>'+
      '<dl class="terms">'+l.terms.map(t=>'<div><dt>'+esc(t.ru)+'<small>'+esc(t.en)+'</small></dt><dd>'+esc(t.definition)+'</dd></div>').join('')+'</dl>'+
      l.sections.map(s=>'<section><h2>'+esc(s.title)+'</h2>'+paragraphs(s.paragraphs)+(s.bullets?list(s.bullets):'')+'</section>').join('')+
      '<h2>Где легко ошибиться</h2>'+l.pitfalls.map(p=>'<div class="callout"><b>'+esc(p.mistake)+'</b><p>'+esc(p.correction)+'</p></div>').join('');
    if(step==='example') body='<h2>'+esc(l.workedExample.title)+'</h2><p>'+esc(l.workedExample.context)+'</p><h3>Как рассуждать</h3>'+list(l.workedExample.steps,true)+'<div class="feedback">'+esc(l.workedExample.conclusion)+'</div><p>Проследите ход решения: какой факт позволил сделать каждый вывод? В следующем шаге попробуйте восстановить принцип без текста перед глазами.</p>';
    if(step==='recall') body='<h2>Объясните своими словами</h2><p>Ответьте без текста урока. Это помогает обнаружить, что вы можете объяснить самостоятельно. Подсказка доступна, но будет отмечена отдельно.</p>'+
      l.recall.prompts.map((prompt,i)=>savedField(l.id,'recall-'+i,prompt)).join('')+
      reveal(l.id,'recall','Свериться с объяснением',list(l.recall.guidance));
    if(step==='case') body='<h2>'+esc(l.transferCase.title)+'</h2><div class="callout"><b>Зачем новый контекст?</b> Здесь проверяем, можете ли вы применить принцип вне знакомого SAP-проекта. Все необходимые факты приведены ниже.</div><p>'+esc(l.transferCase.context)+'</p>'+
      l.transferCase.prompts.map((prompt,i)=>savedField(l.id,'case-'+i,prompt)).join('')+
      reveal(l.id,'case-hint','Нужна подсказка','<p>'+esc(l.transferCase.hint)+'</p>')+
      reveal(l.id,'case-analysis','Сравнить мой ответ с разбором',paragraphs(l.transferCase.analysis)+'<h3>Когда решение изменится</h3><p>'+esc(l.transferCase.alternate)+'</p>')+
      '<h3>Усложнение</h3><p>'+esc(l.stretch.prompt)+'</p>'+savedField(l.id,'stretch','Моё решение дополнительной задачи')+reveal(l.id,'stretch','Посмотреть возможное рассуждение','<p>'+esc(l.stretch.analysis)+'</p>');
    if(step==='artifact') body='<h2>'+esc(l.artifact.title)+'</h2><p>'+esc(l.artifact.instructions)+'</p><p class="muted">Можно взять собственную рабочую ситуацию или учебный пример. Не записывайте персональные данные коллег.</p>'+
      l.artifact.fields.map(f=>savedField(l.id,'artifact-'+f.id,f.label,f.placeholder)).join('')+
      '<h3>Проверка качества документа</h3>'+list(l.artifact.rubric)+
      reveal(l.id,'artifact-example','Посмотреть заполненный пример','<p>'+esc(l.artifact.example)+'</p>')+
      '<button data-action="export-artifact" data-id="'+l.id+'" class="secondary">Скачать мой документ</button>';
    if(step==='lab') body=labBody(l);
    if(step==='check') {
      const currentAttempts=state.attempts.filter(a=>l.questions.some(q=>q.id===a.questionId&&q.version===a.questionVersion));
      const answered=new Set(currentAttempts.map(a=>a.questionId)).size;
      body='<h2>Что остаётся после урока</h2>'+list(l.summary)+'<h3>Вопросы по теме</h3><p>Вы уже ответили на '+answered+' из '+l.questions.length+' вопросов этой версии. Знакомые ситуации и исправленные версии не считаются независимыми новыми заданиями.</p>'+
      '<button data-action="start-practice" data-id="'+l.id+'">Решить вопросы урока</button>'+
      (l.caseStudy?'<section class="callout"><h3>'+esc(l.caseStudy.title)+'</h3><p>Три связанных вопроса к общим данным. Разбор откроется после всего кейса.</p><button data-action="start-case" data-id="'+l.id+'">Решить связанный кейс</button></section>':'')+
      (l.lab?'<p><a href="'+lessonUrl(l.id,'lab')+'">Практикум с данными: '+esc(l.lab.title)+'</a></p>':'')+
      '<h3>Закрыть занятие</h3><p>Отметка означает, что вы сделали учебную работу. Она не подтверждает профессиональную квалификацию.</p>'+
      '<label>Сейчас я…<select data-work="'+l.id+'" data-field="confidence"><option value="">Выберите</option>'+[['3','могу объяснить и применить'],['2','понимаю, но ещё сомневаюсь'],['1','нуждаюсь в повторении']].map(([v,t])=>'<option value="'+v+'"'+(w.fields.confidence===v?' selected':'')+'>'+t+'</option>').join('')+'</select></label>'+
      '<button data-action="complete" data-id="'+l.id+'">'+(state.completedLessons.includes(l.id)?'Сохранить результат занятия':'Завершить занятие')+'</button><div id="completionFeedback"></div>'+
      (state.completedLessons.includes(l.id)?'<div class="feedback">Занятие завершено. Дальше — применение и закрепление. <a href="#week?id='+l.id+'">Продолжить практику темы</a></div>':'');
    }
    const reviewed=l.status==='model_reviewed';
    return '<div class="lesson-shell"><aside class="lesson-nav"><p class="eyebrow">Тема '+l.week+' · несколько занятий</p>'+steps.map(([k,title,time])=>'<a href="'+lessonUrl(l.id,k)+'"'+(k===step?' aria-current="step"':'')+'>'+title+'<small>'+time+'</small></a>').join('')+'<p class="save-status">Ответы сохраняются автоматически</p></aside>'+
    '<article class="lesson-body"><div class="lesson-header"><p class="eyebrow">Неделя '+l.week+' · '+esc(l.approach)+'</p><h1>'+esc(l.title)+'</h1><span class="tag">'+esc(l.eco.domain)+' · Task '+l.eco.taskId+'</span><span class="badge">'+(reviewed?'Рецензия модели выполнена; независимой экспертной проверки нет':'Авторский материал: предметная проверка продолжается')+'</span></div>'+
    body+'<div class="lesson-actions">'+(idx>0?'<a class="button secondary" href="'+lessonUrl(l.id,steps[idx-1][0])+'">← Назад</a>':'<a href="#lessons">Все уроки</a>')+(idx<steps.length-1?'<a class="button" href="'+lessonUrl(l.id,steps[idx+1][0])+'">Далее: '+steps[idx+1][1]+' →</a>':'<a href="#today">На сегодня</a>')+'</div>'+
    '<details><summary>Источники и учебная привязка</summary><p>'+esc(l.eco.taskLabel)+'. Привязка к ECO — авторская классификация темы. Проверено '+config.checkedAt+'.</p>'+sourceLinks(l.sourceRefs)+'</details></article></div>';
  }
  function startPractice(lessonId,kind='lesson') {
    const bank=eligibleBank();
    const selected=kind==='case'?S.caseQuestions(bank,lessonId):lessonId?bank.filter(q=>q.lessonId===lessonId&&!q.caseId&&!q.reserve):L.freshQuestions(lessons,state);
    if(!selected.length){toast('Нет новых проверенных вопросов. Можно повторить учебные вопросы конкретного урока.');return;}
    parkSession();
    state.sessions.quiz={id:uid(),kind,lessonId:lessonId||'',questionIds:selected.map(q=>q.id),previouslySeen:Object.fromEntries(selected.map(q=>[q.id,S.wasSeen(q,state)])),questionSnapshots:Object.fromEntries(selected.map(q=>[q.id,S.prepareQuestion(getQuestion(q.id))])),index:0,startedAt:now(),deadline:kind==='timed'?new Date(Date.now()+selected.length*90*1000).toISOString():'',draftAnswers:{},confidence:{},assisted:{},started:{},responseIds:[],finished:false};
    persist();location.hash='#practice?session=active';
    if(currentRoute.params.get('session')==='active') render();
  }
  function practice() {
    if(currentRoute.params.get('session')==='active'&&state.sessions.quiz) return quizPage();
    const active=state.sessions.quiz&&!state.sessions.quiz.finished;
    return pageHeading('Практика','Отработать конкретный принцип','Вопросы сохранены вместе с разбором. Ответы и выбранная уверенность остаются после перезагрузки.')+
      (active?'<div class="callout">Есть незавершённая сессия. <a href="#practice?session=active">Продолжить</a></div>':'')+
      Object.values(state.sessions.saved||{}).filter(s=>!s.finished).map(s=>'<p><button class="secondary" data-action="resume-saved" data-id="'+esc(s.id)+'">Продолжить сохранённую тренировку: '+esc(getLesson(s.lessonId)?.title||'на время')+'</button></p>').join('')+
      '<div class="grid two">'+lessons.map(l=>'<article class="card"><p class="eyebrow">Урок '+l.week+'</p><h2>'+esc(l.title)+'</h2><p>'+l.questions.length+' вопросов'+(l.caseStudy?', включая 3 по общему кейсу':'')+' · '+esc(l.approach)+'</p><button data-action="start-practice" data-id="'+l.id+'">Практиковаться</button>'+(l.caseStudy?' <button class="secondary" data-action="start-case" data-id="'+l.id+'">Связанный кейс</button>':'')+'<p><a href="'+lessonUrl(l.id,'lab')+'">Практикум с данными</a> · <a href="'+lessonUrl(l.id,'artifact')+'">Рабочий документ</a></p></article>').join('')+'</div>';
  }
  function quizPage() {
    const s=state.sessions.quiz;
    if((s.deadline&&C.remainingSeconds(s)===0)||s.index>=s.questionIds.length){finishSession(s);persist();}
    if(s.finished||s.index>=s.questionIds.length) return quizSummary(s);
    if(S.missingSnapshot(s))return pageHeading('Старая тренировка','Для этого вопроса не сохранился снимок')+'<p>Черновик остаётся в экспорте. Без исходного порядка вариантов его нельзя оценить по обновлённому вопросу. Начните новую тренировку по теме.</p><a class="button" href="#practice">К списку тем</a>';
    const a=state.attempts.find(x=>x.id===s.responseIds[s.index]),q=a?.questionSnapshot||sessionQuestion(s);
    if(!q) return '<p>Версия вопроса обновилась. Сохранённые ответы остаются в истории. Начните новую сессию.</p><a href="#practice">К практике</a>';
    if(!s.started[q.id]){
      const sameFamilyStarted=s.questionIds.some(id=>s.started[id]&&(s.questionSnapshots?.[id]||getQuestion(id))?.scenarioFamilyId===q.scenarioFamilyId);
      if(!sameFamilyStarted&&S.wasSeen(q,state)){
        s.previouslySeen ||= {};
        s.questionIds.filter(id=>(s.questionSnapshots?.[id]||getQuestion(id))?.scenarioFamilyId===q.scenarioFamilyId).forEach(id=>s.previouslySeen[id]=true);
      }
      s.started[q.id]=now();
    }
    if(!state.exposures.some(x=>x.id===q.scenarioFamilyId)) state.exposures.push({id:q.scenarioFamilyId,questionId:q.id,at:now()});
    s.questionSnapshots ||= {};s.questionSnapshots[q.id] ||= structuredClone(q);
    persist();
    const draft=s.draftAnswers[q.id];
    let controls='';
    if(q.type==='single'||q.type==='multi') controls=q.options.map((option,i)=>'<label class="choice"><input type="'+(q.type==='multi'?'checkbox':'radio')+'" name="answer" value="'+i+'"'+(Array.isArray(draft)&&draft.includes(i)?' checked':'')+'><span>'+esc(option)+'</span></label>').join('');
    if(q.type==='numeric') controls='<label>Числовой ответ'+(q.unit?' ('+esc(q.unit)+')':'')+'<input name="numeric" inputmode="decimal" required value="'+esc(draft??'')+'"></label>';
    if(q.type==='matching') controls=q.left.map((left,i)=>'<label>'+esc(left)+'<select name="match-'+i+'" required><option value="">Выберите соответствие</option>'+q.right.map((right,j)=>'<option value="'+j+'"'+(draft?.[i]===j?' selected':'')+'>'+esc(right)+'</option>').join('')+'</select></label>').join('');
    return pageHeading('Практика', 'Вопрос '+(s.index+1)+' из '+s.questionIds.length)+
      '<div class="compact"><p class="question-number">'+esc(getLesson(q.lessonId)?.title||q.topic||'')+' · '+esc(q.approach)+(s.deadline?' · Осталось <span id="timer" class="timing"></span>':'')+'</p>'+stimulus(q.stimulus)+'<h2>'+esc(q.prompt)+'</h2>'+
      (state.quarantined.some(x=>x.questionId===q.id)?'<div class="callout">Вы сообщили о неоднозначности. Этот вопрос исключён из статистики знаний.</div>':'')+
      (a?(deferred(s)?'<div class="feedback">Ответ сохранён. Результаты и объяснения откроются после завершения тренировки.</div>':feedback(q,a)):'<form id="answerForm"><fieldset><legend>'+(q.type==='multi'?'Выберите '+q.correct.length+' подходящих ответа':q.type==='matching'?'Сопоставьте элементы':'Ваш ответ')+'</legend>'+controls+'</fieldset>'+
      '<label>Перед разбором оцените уверенность<select name="confidence" required><option value="">Выберите</option>'+[['3','знаю'],['2','сомневаюсь'],['1','угадал']].map(([v,t])=>'<option value="'+v+'"'+(String(s.confidence[q.id])===v?' selected':'')+'>'+t+'</option>').join('')+'</select></label>'+
      '<details id="questionHint"><summary>Дай подсказку</summary><p>'+esc(q.hint)+'</p></details><button type="submit">'+(deferred(s)?'Сохранить ответ':'Проверить ответ')+'</button><p id="answerError" class="error" role="status"></p></form>')+
      '<div class="actions">'+(a?'<button data-action="next-question">'+(s.index+1===s.questionIds.length?'Завершить сессию':'Следующий вопрос')+'</button>':'')+'<a href="#practice">К списку тем</a><button class="quiet" data-action="ambiguity" data-id="'+q.id+'">Сообщить о неоднозначности</button></div></div>';
  }
  function feedback(q,a) {
    const correct=q.type==='numeric'?q.answer+(q.unit?' '+q.unit:''):q.type==='matching'?q.left.map((x,i)=>x+' → '+q.right[q.correct[i]]).join('; '):q.correct.map(i=>q.options[i]).join('; ');
    const own=q.type==='numeric'?a.answer:q.type==='matching'?q.left.map((x,i)=>x+' → '+(q.right[a.answer?.[i]]||'не выбрано')).join('; '):(Array.isArray(a.answer)?a.answer:[]).map(i=>q.options[i]).join('; ');
    const explanations=q.options?q.options.map((option,i)=>'<li><b>'+esc(option)+'</b><br>'+esc(q.explanations[i])+'</li>').join(''):q.type==='matching'?q.left.map((left,i)=>'<li><b>'+esc(left)+' → '+esc(q.right[q.correct[i]])+'</b><br>'+esc(q.explanations[i])+'</li>').join(''):q.explanations.map(x=>'<li>'+esc(x)+'</li>').join('');
    return '<div class="feedback '+(a.correct?'':'bad')+'"><h3>'+(a.correct?'Верно':'Есть расхождение')+(a.assisted?' · с подсказкой':'')+(a.priorExposure?' · знакомая ситуация':'')+'</h3><p><b>Ваш ответ:</b> '+esc(own)+'</p><p><b>Верный ответ:</b> '+esc(correct)+'</p><p>'+esc(q.principle)+'</p><h4>Почему каждый вариант подходит или не подходит</h4><ul class="steps">'+explanations+'</ul>'+
      (!a.correct?'<label>Что затруднило решение?<select data-error-attempt="'+a.id+'"><option value="">Выберите причину</option>'+['Пробел в знании','Неверно прочитал ситуацию','Путаница подходов','Терминология','Расчёт','Спешка'].map(reason=>'<option'+(state.templates['error-'+a.id]===reason?' selected':'')+'>'+reason+'</option>').join('')+'</select></label><p><a href="'+lessonUrl(q.lessonId)+'">Повторить принцип в уроке</a></p>':'')+'</div>';
  }
  function quizSummary(s) {
    const attempts=s.responseIds.map(id=>state.attempts.find(a=>a.id===id)).filter(Boolean),correct=attempts.filter(a=>a.correct).length;
    return pageHeading('Сессия сохранена','Разберите результат и выберите следующий шаг')+
      '<div class="panel compact"><div class="metric">'+correct+' / '+s.questionIds.length+'</div><p>верных ответов; отвечено '+attempts.length+'. С подсказкой: '+attempts.filter(a=>a.assisted).length+'.</p><p>Это учебная сессия. Повторные задания и подсказки не подтверждают независимую экзаменационную готовность.</p>'+(s.kind==='case'?'<p>Все вопросы этого кейса — одна ситуация. В статистике она учитывается один раз и только после всех ответов; для успешного решения нужны все верные ответы.</p>':'')+
      (s.lessonId?'<a class="button" href="'+lessonUrl(s.lessonId,'check')+'">Вернуться к завершению урока</a>':'<a class="button" href="#review">К повторению</a>')+'</div><h2>Ответы этой сессии</h2>'+
      attempts.map(a=>'<details><summary>'+esc(a.questionSnapshot.prompt)+' · '+(a.correct?'верно':'ошибка')+'</summary>'+stimulus(a.questionSnapshot.stimulus)+feedback(a.questionSnapshot,a)+'</details>').join('');
  }
  function reviewPage() {
    const due=cards.filter(c=>state.reviews[c.id]&&new Date(state.reviews[c.id].dueAt)<=new Date()).sort((a,b)=>new Date(state.reviews[a.id].dueAt)-new Date(state.reviews[b.id].dueAt));
    const hidden=hiddenAttempts(),todayCount=L.reviewedToday(state),c=todayCount<5+reviewExtra?due[0]:null,errors=state.attempts.filter(a=>!a.correct&&!hidden.has(a.id)).slice(-10).reverse();
    if(!c&&due.length)return pageHeading('Повторение','Порция на сегодня выполнена','Сегодня повторено '+todayCount+' карточек. Остальные '+due.length+' можно перенести на другой день.')+'<div class="actions"><a class="button" href="#week">Вернуться к плану недели</a><button data-action="more-reviews" class="secondary">Ещё пять по желанию</button></div>';
    return pageHeading('Ошибки и повторение','Вспомните до показа ответа','Начальная схема — 1 / 3 / 7 / 14 / 30 дней. После ошибки или подсказки возвращаемся к одному дню; это удобное правило, не персонально оптимальный алгоритм.')+
      '<p>Сегодня повторено: '+todayCount+' карточек. Базовая порция — пять.</p>'+
      (c?'<article class="panel compact"><p class="eyebrow">'+due.length+' карточек готовы · Урок '+getLesson(c.lessonId).week+'</p><h2>'+esc(c.front)+'</h2><button data-action="show-card" data-id="'+c.id+'">Показать ответ</button><div id="cardAnswer" hidden><p class="review-answer">'+esc(c.back)+'</p><div class="actions"><button data-action="rate-card" data-id="'+c.id+'" data-rating="3">Вспомнил сам</button><button data-action="rate-card" data-id="'+c.id+'" data-rating="2" class="secondary">Сомневался</button><button data-action="rate-card" data-id="'+c.id+'" data-rating="1" class="secondary">Не вспомнил</button></div></div></article>':'<div class="empty">На сегодня нет назначенных карточек. Завершите урок: его карточки появятся завтра. Изученные материалы доступны в библиотеке.</div>')+
      '<h2>Последние ошибки</h2>'+(errors.length?errors.map(a=>'<details><summary>'+esc(a.questionSnapshot.prompt)+'</summary>'+feedback(a.questionSnapshot,a)+'</details>').join(''):'<p>Ошибок в новых вопросах пока нет.</p>');
  }
  function examsPage() {
    const reserve=eligibleBank().filter(q=>q.reserve&&(q.status==='model_reviewed'||q.status==='expert_reviewed')),newReserve=reserve.filter(q=>!state.exposures.some(x=>x.id===q.scenarioFamilyId));
    const unique=new Set(newReserve.map(q=>q.scenarioFamilyId)).size;
    return pageHeading('Пробные экзамены','Готовность требует новых задач','Учебный банк и независимый диагностический резерв учитываются раздельно.')+
      '<section class="panel"><h2>Полный пробник: '+config.blueprint.questions+' вопросов</h2><p>В резерве доступно '+unique+' новых проверенных сценариев. Требуется ещё '+Math.max(0,config.blueprint.questions-unique)+'. Учебные '+questions.length+' вопросов уже используются в уроках и не заменяют независимый резерв.</p><button disabled>Полный пробник недоступен</button><p class="muted">Три независимых пробника потребуют 540 резервных заданий. На этом этапе полезнее освоить принцип и проверить перенос в новую ситуацию.</p></section>'+
      '<div class="grid two"><article class="card"><h2>Короткая тренировка времени</h2><p>До 10 ещё не открытых учебных вопросов, по 90 секунд на вопрос. Таймер продолжает идти после обновления и закрытия страницы. Распределение учебного банка не является моделью полного экзамена.</p><button data-action="timed">Начать тренировку</button></article><article class="card"><h2>Раздельные ориентиры</h2><p>Знания: новые ответы и сохранение навыка через 1–2 недели. Допуск: образование, опыт и обучение. Административно: заявление, документы и запись в PMI.</p><a href="#experience">Проверить данные допуска</a></article></div>'+
      '<p>Учебная эвристика на будущее: три новых смешанных пробника около 80%+, домены не ниже примерно 70% и соблюдение времени. Это не проходной балл PMI. Сейчас данных для такого вывода недостаточно.</p>'+sourceLinks([{id:'PMI-ECO-2026',section:'Exam information, pp. 17–22'}]);
  }
  function experiencePage() {
    const months=C.countExperienceMonths(state.experience),required=config.eligibility.months[state.profile.education];
    const training=C.countTrainingHours(state.training);
    return pageHeading('Мой опыт и допуск','Опыт, обучение и документы','Учитывайте работу по руководству проектом, а не всё время технической поддержки. Запись здесь не заменяет проверку PMI.')+
      '<div class="grid"><article class="card"><div class="metric">'+months+'</div><p>уникальных месяцев в подтверждённых вами записях за 10 лет</p></article><article class="card"><div class="metric">'+(required??'—')+'</div><p>месяцев по выбранному уровню образования; при неизвестном образовании путь не выбирается</p></article><article class="card"><div class="metric">'+training+' / 35</div><p>часов в ваших подтверждаемых записях обучения</p></article></div>'+
      '<div class="grid two"><section class="panel"><h2>Период работы над проектом</h2><form id="experienceForm"><label>Проект и управленческая роль<input name="title" required maxlength="160"></label><label>Начало<input name="start" type="month" required></label><label>Окончание<input name="end" type="month" required></label><label class="choice"><input type="checkbox" name="confirmed"><span>Могу обосновать руководство проектной работой и подтвердить этот период</span></label><button>Добавить период</button><p id="expError" class="error"></p></form>'+
      '<ul class="list">'+state.experience.map(x=>'<li><b>'+esc(x.title)+'</b><br>'+esc(x.start)+' — '+esc(x.end)+' · '+(x.confirmed?'включён в ориентир':'черновик')+'</li>').join('')+'</ul></section>'+
      '<section class="panel"><h2>Подтверждаемое обучение</h2><form id="trainingForm"><label>Название курса, провайдер и документ<input name="title" required maxlength="200"></label><label>Часов<input name="hours" type="number" min="0.5" max="500" step="0.5" required></label><label>Дата завершения<input name="date" type="date" required></label><label class="choice"><input type="checkbox" name="confirmed"><span>Есть документ; содержание соответствует управлению проектами</span></label><button>Добавить обучение</button></form><p class="muted">Время на сайте хранится как самостоятельная учёба и не засчитывается автоматически в 35 часов. Применимость CAPM и курсов проверяйте перед заявлением. С 01.12.2026 меняются допустимые провайдеры live instructor-led обучения.</p><ul>'+state.training.map(x=>'<li>'+esc(x.title)+' — '+x.hours+' ч.</li>').join('')+'</ul></section></div>'+
      '<section class="panel"><h2>Журнал переноса в работу</h2><form id="journalForm"><label>Что применили, что получилось и какой вывод сделали?<textarea name="note" maxlength="5000" required></textarea></label><button>Сохранить запись</button></form><ul class="list">'+state.journal.slice().reverse().map(x=>'<li>'+esc(x.note)+'<br><small>'+formatDate(x.at)+'</small></li>').join('')+'</ul><button data-action="export-journal" class="secondary">Скачать журнал</button></section>'+
      '<h2>Перед заявлением</h2><ol><li>Уточнить уровень образования и непересекающиеся периоды руководства проектами.</li><li>Собрать подтверждения обучения либо проверить применимое освобождение.</li><li>Сверить текущие требования PMI, подготовить описания опыта и контакты для аудита.</li></ol>'+
      sourceLinks([{id:'PMI-ECO-2026',section:'Eligibility, pp. 13–16'},{id:'PMI-NEW-2026',section:'Training requirements'}]);
  }
  function settingsPage() {
    const backups=readBackups();
    return pageHeading('Настройки','Данные принадлежат вам','Сохраняйте экспорт перед сменой браузера или устройства. Автоматической синхронизации нет.')+
      '<div class="grid two"><section><h2>Мой план</h2>'+profileForm()+'</section><section><h2>Резервная копия и перенос</h2><div class="panel"><button data-action="export">Экспортировать все данные</button><label>Файл для восстановления<input id="importFile" type="file" accept=".json,application/json"></label><div id="importPreview"></div><h3>Копии перед заменой</h3>'+
      (backups.length?backups.map((b,i)=>'<p>'+formatDate(b.savedAt)+' <button class="secondary" data-action="download-backup" data-index="'+i+'">Скачать копию '+(i+1)+'</button></p>').join(''):'<p>Замена данных ещё не выполнялась.</p>')+
      '<p class="muted">Объединение сохраняет текущий профиль и черновики, добавляя отсутствующие записи. Повторный импорт не создаёт дубликаты. Перед заменой создаётся отдельная резервная копия.</p></div></section></div>'+
      '<section class="panel"><h2>Качество материалов</h2><p>'+lessons.length+' уроков · '+questions.length+' тематических вопросов · '+cards.length+' карточек · '+lessons.length+' заполняемых учебных документов.</p><p>Рецензия выполнена моделями для опубликованных материалов. Независимой экспертной сертификации нет; спорный вопрос можно исключить кнопкой в разборе.</p><p>История старой версии: '+Object.keys(state.legacy.attempts).length+' ответов и '+state.legacy.completedLessons.length+' отметок. Они сохранены в экспорте, но не повышают результаты новых уроков.</p></section>'+
      '<h2>Источники и работа без сети</h2><p>Версия '+config.version+' · ECO '+config.blueprint.id+' · источники проверены '+config.checkedAt+'. После первого полного открытия оболочка и шесть пакетов доступны offline. Уроки, практика, повторение и статистика не вызывают AI. Внешние ссылки требуют интернета.</p>'+
      '<p>AI выключен; бюджет 0. API-ключи не принимаются в браузере. Учебные материалы и локальный запуск не требуют отдельной оплаты API или хостинга.</p>'+
      '<button data-action="check-update" class="secondary">Проверить обновление приложения</button>'+sourceLinks([{id:'PMI-ECO-2026',section:'Текущая экзаменационная программа'},{id:'PMI-NEW-2026',section:'Проверить действующие требования вручную'}]);
  }
  function readBackups() { try { const b=JSON.parse(localStorage.getItem(C.BACKUP_KEY)||'[]');return Array.isArray(b)?b:[]; }catch{return [];} }
  function render() {
    clearInterval(timer);
    const pinned=state.settings.studyWeek;
    if(state.settings.mode!=='foundation'&&(!pinned||pinned.mode!==state.settings.mode||pinned.cycle!==L.cycleKey())){const chosen=L.selectLesson(lessons,state);if(chosen){state.settings.studyWeek={mode:state.settings.mode,cycle:L.cycleKey(),lessonId:chosen.id};persist();}}
    const [name,query='']=(location.hash.slice(1)||'today').split('?'); currentRoute={name,params:new URLSearchParams(query)};
    const views={today,route:routePage,week:weekPage,progress:progressPage,lessons:library,lesson:lessonPage,practice,review:reviewPage,exams:examsPage,experience:experiencePage,settings:settingsPage};
    const nav=[['today','Сегодня'],['route','Маршрут'],['lessons','Уроки и словарь'],['practice','Практика'],['progress','Прогресс'],['review','Повторение'],['exams','Пробные'],['experience','Опыт'],['settings','Настройки']];
    $('#nav').innerHTML=nav.map(([key,label])=>'<a href="#'+key+'"'+(key===(name==='lesson'?'lessons':name)?' aria-current="page"':'')+'>'+label+'</a>').join('');
    $('#nav').classList.remove('open');$('#menuBtn').setAttribute('aria-expanded','false');
    try { $('#main').innerHTML=(views[name]||today)();bindForms(); }
    catch(error) { console.error(error);$('#main').innerHTML='<h1>Не удалось открыть раздел</h1><p>'+esc(error.message)+'</p><button data-action="export">Скачать сохранённые данные</button>'; }
    $('#main').focus({preventScroll:true});window.scrollTo(0,0);
    if($('#timer')) { const tick=()=>{const s=state.sessions.quiz,left=C.remainingSeconds(s);if($('#timer'))$('#timer').textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');if(left===0){finishSession(s);persist();render();}};tick();timer=setInterval(tick,1000); }
  }
  function download(name,content,type='application/json') {
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportState() { download('pmp-backup-'+now().slice(0,10)+'.json',JSON.stringify({schemaVersion:2,exportedAt:now(),state},null,2)); }
  function bindForms() {
    $('#weekSelect')?.addEventListener('change',event=>{if(state.settings.mode!=='foundation'){state.settings.studyWeek={mode:state.settings.mode,cycle:L.cycleKey(),lessonId:event.target.value};persist();}location.hash='#week?id='+event.target.value;});
    $('#profileForm')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.target),first=!state.onboarding;state.profile={name:f.get('name').trim(),education:f.get('education'),hours:Number(f.get('hours')),examDate:f.get('examDate'),language:f.get('language')};state.onboarding=true;if(persist()){toast('Настройки сохранены');if(first){location.hash='#today';render();}}});
    document.querySelectorAll('[data-reveal]').forEach(details=>details.addEventListener('toggle',()=>{if(details.open){const w=work(details.dataset.lesson);if(!w.revealed.includes(details.dataset.reveal)){w.revealed.push(details.dataset.reveal);persist();}}}));
    $('#questionHint')?.addEventListener('toggle',event=>{if(event.target.open){const s=state.sessions.quiz,q=sessionQuestion(s);s.assisted[q.id]=true;const exposure=state.exposures.find(x=>x.id===q.scenarioFamilyId);if(exposure&&!exposure.helpAt)exposure.helpAt=now();persist();}});
    $('#answerForm')?.addEventListener('submit',submitAnswer);
    $('#answerForm')?.addEventListener('change',saveQuizDraft);
    $('#answerForm')?.addEventListener('input',saveQuizDraft);
    $('#experienceForm')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.target),start=f.get('start'),end=f.get('end');if(start>end||end>now().slice(0,7)){$('#expError').textContent='Проверьте даты: конец должен быть не раньше начала и не позже текущего месяца.';return;}state.experience.push({id:uid(),title:f.get('title'),start,end,confirmed:f.has('confirmed')});if(persist())render();});
    $('#trainingForm')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.target);state.training.push({id:uid(),title:f.get('title'),hours:Number(f.get('hours')),date:f.get('date'),confirmed:f.has('confirmed')});if(persist())render();});
    $('#journalForm')?.addEventListener('submit',event=>{event.preventDefault();state.journal.push({id:uid(),at:now(),note:new FormData(event.target).get('note')});if(persist())render();});
    $('#importFile')?.addEventListener('change',previewImport);
    $('#lessonSearch')?.addEventListener('input',event=>{const term=event.target.value.toLocaleLowerCase('ru');$('#lessonResults').innerHTML=lessons.filter(l=>JSON.stringify([l.title,l.terms]).toLocaleLowerCase('ru').includes(term)).map(lessonCard).join('')||'<p>Тема не найдена.</p>';});
  }
  function getAnswer(form,q) {
    const f=new FormData(form);
    if(q.type==='numeric')return f.get('numeric');
    if(q.type==='matching')return q.left.map((_,i)=>f.get('match-'+i)===''?-1:Number(f.get('match-'+i)));
    return f.getAll('answer').map(Number);
  }
  function saveQuizDraft(event) { const s=state.sessions.quiz,q=sessionQuestion(s);s.draftAnswers[q.id]=getAnswer(event.currentTarget,q);s.confidence[q.id]=Number(new FormData(event.currentTarget).get('confidence')||0);persist(); }
  function submitAnswer(event) {
    event.preventDefault();const s=state.sessions.quiz,q=sessionQuestion(s),answer=getAnswer(event.target,q),confidence=Number(new FormData(event.target).get('confidence'));
    if(s.finished||(s.deadline&&C.remainingSeconds(s)===0)){finishSession(s);persist();render();return;}
    if(s.responseIds[s.index])return;
    if((Array.isArray(answer)&&(!answer.length||answer.includes(-1)))||answer===''){ $('#answerError').textContent='Сначала дайте ответ.';return; }
    const a={id:uid(),sessionId:s.id,questionId:q.id,questionVersion:q.version,questionSnapshot:structuredClone(q),answer,correct:C.grade(q,answer),confidence,priorExposure:!!s.previouslySeen?.[q.id],assisted:!!s.assisted[q.id]||!!state.exposures.find(x=>x.id===q.scenarioFamilyId)?.helpAt,answeredAt:now(),elapsedSeconds:Math.min(86400,Math.max(0,Math.round((Date.now()-new Date(s.started[q.id]).getTime())/1000)))};
    state.attempts.push(a);s.responseIds[s.index]=a.id;
    if(!deferred(s))scheduleMistake(a);
    if(persist())render();
  }
  async function previewImport(event) {
    const file=event.target.files[0];if(!file)return;
    try {
      if(file.size>10*1024*1024)throw Error('Файл превышает 10 МБ.');
      pendingImport=C.parseImport(await file.text());
      $('#importPreview').innerHTML='<div class="feedback"><h3>Предпросмотр импорта</h3><p>'+pendingImport.attempts.length+' новых попыток, '+pendingImport.journal.length+' записей журнала, '+Object.keys(pendingImport.lessonWork).length+' черновиков уроков.</p><button data-action="merge">Объединить</button> <button data-action="replace" class="secondary">Заменить с резервной копией</button></div>';
    }catch(error){pendingImport=null;$('#importPreview').innerHTML='<p class="error">'+esc(error.message)+'</p>';}
  }
  function completeLesson(id) {
    const l=getLesson(id),w=work(id),missing=[];
    if(l.recall.prompts.some((_,i)=>(w.fields['recall-'+i]||'').trim().length<10))missing.push('Дайте три ответа своими словами (по предложению).');
    if(l.transferCase.prompts.some((_,i)=>(w.fields['case-'+i]||'').trim().length<10))missing.push('Запишите решения трёх вопросов новой ситуации.');
    if(l.artifact.fields.some(f=>(w.fields['artifact-'+f.id]||'').trim().length<5))missing.push('Заполните все поля рабочего документа.');
    if(new Set(state.attempts.filter(a=>l.questions.some(q=>q.id===a.questionId&&q.version===a.questionVersion)).map(a=>a.questionId)).size<3)missing.push('Решите хотя бы три тематических вопроса.');
    if(!w.fields.confidence)missing.push('Выберите уверенность перед завершением.');
    if(missing.length){$('#completionFeedback').innerHTML='<div class="callout"><b>До завершения осталось:</b>'+list(missing)+'</div>';return;}
    if(!state.completedLessons.includes(id)){state.completedLessons.push(id);l.cards.forEach(c=>state.reviews[c.id]=C.nextReview(null,true,Number(w.fields.confidence),false));}
    w.completedAt=now();if(persist()){toast('Практика сохранена. Повторение назначено на завтра.');render();}
  }
  document.addEventListener('input',event=>{
    const el=event.target;if(el.dataset.work){work(el.dataset.work).fields[el.dataset.field]=el.value;persist();}
  });
  document.addEventListener('change',event=>{
    const el=event.target;if(el.dataset.work){work(el.dataset.work).fields[el.dataset.field]=el.value;persist();}
    if(el.dataset.errorAttempt){state.templates['error-'+el.dataset.errorAttempt]=el.value;persist();}
  });
  document.addEventListener('click',async event=>{
    const b=event.target.closest('[data-action]');if(!b||!state)return;
    const action=b.dataset.action,id=b.dataset.id;
    try {
      if(action==='mode'){state.settings.mode=b.dataset.mode;persist();render();if(b.dataset.mode==='intensive')notice('Перед интенсивом сверьте ECO и правила на сайте PMI. Дата проверки сохранённых правил: '+config.checkedAt+'.');}
      if(action==='start-practice')startPractice(id);
      if(action==='start-case')startPractice(id,'case');
      if(action==='resume-saved'){const saved=state.sessions.saved?.[id];if(saved){parkSession();state.sessions.quiz=saved;delete state.sessions.saved[id];persist();location.hash='#practice?session=active';}}
      if(action==='timed')startPractice(null,'timed');
      if(action==='next-question'){const s=state.sessions.quiz;s.index++;if(s.index>=s.questionIds.length)finishSession(s);persist();render();}
      if(action==='complete')completeLesson(id);
      if(action==='complete-lab'){
        const l=getLesson(id),key=S.labKey(l),f=work(id).fields;
        if(l.lab.prompts.some((_,i)=>(f[key+'answer-'+i]||'').trim().length<20)||l.lab.rubric.some((_,i)=>f[key+'criterion-'+i]!=='yes')){$('#labFeedback').textContent='Запишите три обоснованных ответа и проверьте каждый критерий. Если нужна доработка, черновик уже сохранён.';return;}
        f[key+'done']=now();if(persist()){render();toast('Самопроверка практикума сохранена.');}
      }
      if(action==='export-lab'){
        const l=getLesson(id),key=S.labKey(l),f=work(id).fields;
        const table=l.lab.table,cell=v=>String(v).replace(/\|/g,'\\|').replace(/\n/g,' '),row=values=>'| '+values.map(cell).join(' | ')+' |';
        const data=table.caption+'\n\n'+row(table.columns)+'\n'+row(table.columns.map(()=>'---'))+'\n'+table.rows.map(row).join('\n');
        download(id+'-lab-v'+l.version+'.md','# '+l.lab.title+'\n\n'+l.lab.context+'\n\n'+data+'\n\n'+l.lab.prompts.map((p,i)=>'## '+p+'\n'+(f[key+'answer-'+i]||'')).join('\n\n')+'\n\n## Самопроверка\n'+l.lab.rubric.map((r,i)=>'- '+r+': '+(f[key+'criterion-'+i]==='yes'?'есть доказательство':'нужна доработка')).join('\n'),'text/markdown;charset=utf-8');
      }
      if(action==='complete-week'){
        const l=getLesson(id),task=L.week(l,state).items.find(t=>t.id===b.dataset.task),f=work(id).fields;
        if(task.id==='lesson'&&l.recall.prompts.some((_,i)=>(f['recall-'+i]||'').trim().length<10)){$('#weekFeedback').textContent='Запишите три ответа на шаге урока «Вспомнить». Полное завершение урока для этого блока не требуется.';return;}
        if(task.id==='challenge'&&l.lab&&!f[S.labKey(l)+'done']){$('#weekFeedback').textContent='Завершите практикум с данными и его самопроверку по ссылке выше. Старые результаты сохранены отдельно.';return;}
        if((f[task.key+'note']||'').trim().length<30||f[task.key+'check']!=='yes'){$('#weekFeedback').textContent='Запишите результат хотя бы одним содержательным предложением и выполните самопроверку.';return;}
        f[task.key+'-done']=now();if(persist()){render();toast('Шаг недели сохранён.');}
      }
      if(action==='export-week'){const l=getLesson(id);download(id+'-week.md','# '+l.title+'\n\n'+L.week(l,state).items.map(t=>'## '+t.title+'\n'+(work(id).fields[t.key+'note']||'Ещё не заполнено')).join('\n\n'),'text/markdown;charset=utf-8');}
      if(action==='ambiguity'){if(!state.quarantined.some(x=>x.questionId===id))state.quarantined.push({id:uid(),questionId:id,at:now()});persist();toast('Вопрос исключён из статистики на этом устройстве.');}
      if(action==='show-card'){$('#cardAnswer').hidden=false;b.hidden=true;}
      if(action==='rate-card'){const rating=Number(b.dataset.rating);state.reviews[id]={...C.nextReview(state.reviews[id],rating!==1,rating,false),lastReviewedDay:L.dayKey(),lastRating:rating};persist();render();}
      if(action==='more-reviews'){reviewExtra+=5;render();}
      if(action==='export')exportState();
      if(action==='download-backup'){const backup=readBackups()[Number(b.dataset.index)];download('pmp-previous-state.json',JSON.stringify({schemaVersion:2,state:backup.state},null,2));}
      if(action==='merge'||action==='replace'){
        if(stale)throw Error('Данные изменены в другой вкладке. Перезагрузите страницу перед импортом.');
        if(!pendingImport)return;
        const next=action==='merge'?C.mergeState(state,pendingImport):pendingImport;
        C.backup(localStorage,state);C.save(localStorage,next);state=next;pendingImport=null;notice('Импорт выполнен. Предыдущее состояние доступно в резервных копиях.');render();
      }
      if(action==='export-journal')download('pmp-journal.md','# Журнал практики\n\n'+state.journal.map(x=>'## '+formatDate(x.at)+'\n'+x.note).join('\n\n'),'text/markdown;charset=utf-8');
      if(action==='export-artifact'){const l=getLesson(id),w=work(id);download(id+'-practice.md','# '+l.artifact.title+'\n\n'+l.artifact.fields.map(f=>'## '+f.label+'\n'+(w.fields['artifact-'+f.id]||'')).join('\n\n'),'text/markdown;charset=utf-8');}
      if(action==='check-update'){const reg=await navigator.serviceWorker?.getRegistration();if(reg){await reg.update();toast('Обновление запрошено. Новая версия появится в уведомлении.');}else toast('Сначала откройте приложение с запущенным локальным сервером.');}
    }catch(error){notice(error.message);}
  });
  window.addEventListener('storage',event=>{if(event.key===C.KEY){stale=true;notice('Данные изменены в другой вкладке. Перезагрузите страницу перед продолжением; текущий вариант можно экспортировать.');}});
  async function installOffline() {
    if(!('serviceWorker' in navigator))return;
    try {
      const reg=await navigator.serviceWorker.register('./sw.js');
      const showUpdate=worker=>{waitingWorker=worker;$('#update').hidden=false;};
      if(reg.waiting)showUpdate(reg.waiting);
      reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate(worker);});});
      $('#applyUpdate').onclick=()=>{if(!persist()||persistenceError)return;waitingWorker?.postMessage({type:'ACTIVATE_UPDATE'});};
      let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(waitingWorker&&!reloading){reloading=true;location.reload();}});
      await reg.update();
    }catch(error){notice('Offline-кеш пока не обновлён. Уроки доступны, пока работает локальный сервер.');}
  }
  async function boot() {
    try {
      const loaded=C.load(localStorage);state=loaded.state;
      if(!state){showRecovery(loaded.notice);return;}
      notice(loaded.notice);
      const packs=await Promise.all(config.packs.map(async path=>{const r=await fetch(path);if(!r.ok)throw Error('Не удалось загрузить '+path);const pack=await r.json();if(pack.schemaVersion!==2||!Array.isArray(pack.lessons))throw Error('Неподдерживаемый учебный пакет');return pack;}));
      lessons=packs.flatMap(pack=>pack.lessons).sort((a,b)=>a.week-b.week);
      questions=S.questions(lessons);
      cards=lessons.flatMap(l=>l.cards.map(c=>({...c,lessonId:l.id})));
      $('#menuBtn').onclick=()=>{$('#nav').classList.toggle('open');$('#menuBtn').setAttribute('aria-expanded',String($('#nav').classList.contains('open')));};
      window.addEventListener('hashchange',render);persist();render();installOffline();
    }catch(error){console.error(error);$('#main').innerHTML='<h1>Не удалось загрузить приложение</h1><p>'+esc(error.message)+'</p><p>Убедитесь, что локальный сервер запущен и все шесть пакетов находятся в проекте. Сохранённые ответы не удалены.</p>';}
  }
  function showRecovery(message) {
    const raw=localStorage.getItem(C.KEY)||localStorage.getItem(C.LEGACY_KEY)||'{}';let recovered=null,rawDownloaded=false;
    $('#main').innerHTML='<h1>Нужно восстановить сохранение</h1><p>'+esc(message)+'</p><p>Исходные данные не изменены. Скачайте их и выберите ранее экспортированную исправную копию.</p><button id="downloadRaw">Скачать исходные данные</button><label>Исправная резервная копия<input id="recoveryFile" type="file" accept=".json,application/json"></label><p id="recoveryPreview" role="status"></p><button id="restoreRecovery" hidden>Восстановить выбранную копию</button>';
    $('#downloadRaw').onclick=()=>{download('pmp-recovery-original.json',raw);rawDownloaded=true;};
    $('#recoveryFile').onchange=async event=>{
      try{const file=event.target.files[0];if(!file)return;if(file.size>10*1024*1024)throw Error('Файл превышает 10 МБ.');recovered=C.parseImport(await file.text());$('#recoveryPreview').textContent='В копии: '+recovered.attempts.length+' попыток и '+Object.keys(recovered.lessonWork).length+' черновиков. Повреждённое сохранение останется отдельной локальной копией.';$('#restoreRecovery').hidden=false;}
      catch(error){recovered=null;$('#recoveryPreview').textContent=error.message;$('#restoreRecovery').hidden=true;}
    };
    $('#restoreRecovery').onclick=()=>{try{if(!recovered)return;try{localStorage.setItem(C.KEY+'-recovery-'+Date.now(),raw);}catch(error){if(!rawDownloaded)throw Error('Для локальной копии недостаточно места. Сначала скачайте исходные данные, затем повторите восстановление.');}C.save(localStorage,recovered);location.reload();}catch(error){$('#recoveryPreview').textContent='Не удалось восстановить данные: '+error.message;}};
  }
  function parkSession(){const s=state.sessions.quiz;if(s&&!s.finished){state.sessions.saved ||= {};state.sessions.saved[s.id]=structuredClone(s);}}
  boot();
})();
