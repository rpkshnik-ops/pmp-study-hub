(function (root) {
  'use strict';

  var KEY = 'pmp-study-hub-state-v2';
  var LEGACY_KEY = 'pmp-study-hub-state-v1';
  var BACKUP_KEY = 'pmp-study-hub-backups-v2';
  var MAX_TEXT = 10000, MAX_IMPORT = 10 * 1024 * 1024, MAX_LIST = 5000;
  var badKeys = { '__proto__': true, 'prototype': true, 'constructor': true };

  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function plain(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
    var p = Object.getPrototypeOf(o); return p === Object.prototype || p === null;
  }
  function clone(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(clone);
    var out = {}; Object.keys(v).forEach(function (k) { out[k] = clone(v[k]); }); return out;
  }
  function fail(msg) { throw new Error(msg); }
  function text(v, name, limit) {
    if (typeof v !== 'string') fail('Некорректное поле: ' + name);
    if (v.length > (limit || MAX_TEXT)) fail('Слишком длинное поле: ' + name);
    return v;
  }
  function num(v, name, min, max) {
    if (typeof v !== 'number' || !isFinite(v) || v < min || v > max) fail('Некорректное поле: ' + name);
    return v;
  }
  function safe(value, depth) {
    if (depth > 20) fail('Слишком глубокие данные');
    if (typeof value === 'string') return text(value, 'текст');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return num(value, 'число', -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    if (Array.isArray(value)) {
      if (value.length > MAX_LIST) fail('Слишком много записей');
      return value.map(function (x) { return safe(x, depth + 1); });
    }
    if (!plain(value)) fail('Некорректный объект');
    var o = {};
    Object.keys(value).forEach(function (k) {
      if (badKeys[k]) fail('Запрещённый ключ');
      if (k.length > 100) fail('Слишком длинный ключ');
      o[k] = safe(value[k], depth + 1);
    });
    return o;
  }
  function arr(v, name) { if (!Array.isArray(v) || v.length > MAX_LIST) fail('Некорректное поле: ' + name); return v; }
  function id(v, name) { return text(v, name || 'id', 200); }
  function createState() {
    return { schemaVersion: 2, profile: { name: '', education: 'unknown', hours: 5, language: 'ru', examDate: '' }, onboarding: false,
      settings: { mode: 'foundation' }, lessonWork: {}, completedLessons: [], attempts: [], reviews: {}, journal: [], experience: [], training: [], templates: {}, exposures: [], quarantined: [], sessions: {}, legacy: { attempts: {}, completedLessons: [] } };
  }
  function normalizeAttempt(a) {
    if (!plain(a)) fail('Некорректная попытка');
    if (typeof a.correct !== 'boolean' || typeof a.assisted !== 'boolean') fail('Некорректный результат попытки');
    if (!plain(a.questionSnapshot) || typeof a.questionSnapshot.prompt !== 'string') fail('Отсутствует снимок вопроса');
    if (!Number.isFinite(Date.parse(a.answeredAt))) fail('Некорректная дата ответа');
    var x = { id: id(a.id, 'id попытки'), questionId: id(a.questionId, 'вопрос'), questionVersion: num(a.questionVersion, 'версия вопроса', 1, 10000),
      questionSnapshot: safe(a.questionSnapshot, 0), answer: safe(a.answer, 0), correct: !!a.correct, confidence: num(a.confidence, 'уверенность', 0, 5), assisted: !!a.assisted,
      answeredAt: text(a.answeredAt, 'дата ответа', 100), elapsedSeconds: num(a.elapsedSeconds, 'время ответа', 0, 86400) };
    if (a.priorExposure !== undefined && typeof a.priorExposure !== 'boolean') fail('Некорректная предыдущая попытка');
    x.priorExposure = a.priorExposure === true;
    return x;
  }
  function normalizeRecordList(v, name) { return arr(v, name).map(function (x) { if (!plain(x)) fail('Некорректная запись: ' + name); return safe(x, 0); }); }
  function timestamp(v, name) { if (typeof v !== 'string' || !Number.isFinite(Date.parse(v))) fail('Некорректная дата: ' + name); return text(v, name, 100); }
  function uniqueIds(values, name) {
    var seen = {};
    values.forEach(function (value) { value = id(value, name); if (!value || seen[value]) fail('Некорректные идентификаторы: ' + name); seen[value] = true; });
    return seen;
  }
  function quizSnapshot(snapshot, questionId) {
    if (!plain(snapshot) || id(snapshot.id, 'снимок вопроса') !== questionId || !text(snapshot.prompt, 'вопрос снимка') || !['single','multi','numeric','matching'].includes(snapshot.type) || !text(snapshot.principle, 'принцип снимка') || !text(snapshot.hint, 'подсказка снимка') || !Array.isArray(snapshot.explanations) || !snapshot.explanations.every(function (x) { return typeof x === 'string'; })) fail('Некорректный снимок вопроса');
    if (snapshot.type === 'numeric') {
      if (typeof snapshot.answer !== 'number' || !isFinite(snapshot.answer) || typeof snapshot.tolerance !== 'number' || !isFinite(snapshot.tolerance) || snapshot.tolerance < 0) fail('Некорректный числовой снимок');
    } else if (snapshot.type === 'matching') {
      if (!Array.isArray(snapshot.left) || !snapshot.left.length || !Array.isArray(snapshot.right) || !snapshot.right.length || !snapshot.left.every(function (x) { return typeof x === 'string'; }) || !snapshot.right.every(function (x) { return typeof x === 'string'; }) || !Array.isArray(snapshot.correct) || snapshot.correct.length !== snapshot.left.length || !snapshot.correct.every(function (x) { return Number.isInteger(x) && x >= 0 && x < snapshot.right.length; })) fail('Некорректный снимок сопоставления');
    } else {
      if (!Array.isArray(snapshot.options) || !snapshot.options.length || !snapshot.options.every(function (x) { return typeof x === 'string'; }) || !Array.isArray(snapshot.correct) || !snapshot.correct.length || !snapshot.correct.every(function (x) { return Number.isInteger(x) && x >= 0 && x < snapshot.options.length; })) fail('Некорректный снимок выбора');
      uniqueIds(snapshot.correct.map(String), 'варианты снимка');
    }
    return safe(snapshot, 0);
  }
  function quizMap(value, name, questionIds, check) {
    if (!plain(value)) fail('Некорректные данные сессии: ' + name);
    Object.keys(value).forEach(function (questionId) { if (!questionIds[questionId]) fail('Некорректный вопрос сессии'); check(value[questionId], questionId); });
  }
  function normalizeQuizSession(session) {
    if (!plain(session) || !id(session.id, 'id сессии') || !['lesson','practice','timed'].includes(session.kind) || typeof session.lessonId !== 'string' || !Array.isArray(session.questionIds) || !Number.isInteger(session.index) || typeof session.finished !== 'boolean') fail('Некорректная учебная сессия');
    var questionIds = uniqueIds(session.questionIds, 'вопросы сессии');
    if (!session.questionIds.length || session.index < 0 || session.index > session.questionIds.length || !Array.isArray(session.responseIds) || session.responseIds.length > session.questionIds.length) fail('Некорректная учебная сессия');
    uniqueIds(session.responseIds, 'ответы сессии');
    timestamp(session.startedAt, 'начало сессии');
    if (session.deadline !== '' && session.deadline !== undefined) timestamp(session.deadline, 'таймер');
    if (session.questionSnapshots !== undefined) {
      if (!plain(session.questionSnapshots)) fail('Некорректные снимки вопросов');
      Object.keys(session.questionSnapshots).forEach(function (questionId) { if (!questionIds[questionId]) fail('Некорректный вопрос снимка'); quizSnapshot(session.questionSnapshots[questionId], questionId); });
    }
    quizMap(session.draftAnswers, 'черновики', questionIds, function (answer, questionId) {
      var snapshot = session.questionSnapshots && session.questionSnapshots[questionId];
      if (!snapshot && (typeof answer === 'string' || (Array.isArray(answer) && answer.every(function (x) { return Number.isInteger(x); })))) return;
      if (snapshot && snapshot.type === 'numeric' && typeof answer === 'string') return;
      if (!snapshot || !Array.isArray(answer)) fail('Некорректный черновик');
      if ((snapshot.type === 'single' || snapshot.type === 'multi') && answer.every(function (x) { return Number.isInteger(x) && x >= 0 && x < snapshot.options.length; })) return;
      if (snapshot.type === 'matching' && answer.length === snapshot.left.length && answer.every(function (x) { return Number.isInteger(x) && x >= -1 && x < snapshot.right.length; })) return;
      fail('Некорректный черновик');
    });
    quizMap(session.confidence, 'уверенность', questionIds, function (value) { if (!Number.isInteger(value) || value < 0 || value > 3) fail('Некорректная уверенность'); });
    quizMap(session.assisted, 'подсказки', questionIds, function (value) { if (typeof value !== 'boolean') fail('Некорректная подсказка'); });
    quizMap(session.started, 'время начала вопроса', questionIds, function (value) { timestamp(value, 'начало вопроса'); });
    if (session.previouslySeen !== undefined) quizMap(session.previouslySeen, 'предыдущее знакомство', questionIds, function (value) { if (typeof value !== 'boolean') fail('Некорректная отметка предыдущего знакомства'); });
    return safe(session, 0);
  }
  function validateState(input) {
    if (!plain(input)) fail('Некорректное состояние');
    if (input.schemaVersion !== 2) fail('Неподдерживаемая версия данных');
    safe(input, 0);
    var d = createState(), p = input.profile;
    if (!plain(p)) fail('Некорректный профиль');
    d.profile = { name: text(p.name, 'имя', 200), education: text(p.education, 'образование', 80), hours: num(p.hours, 'часы', 0, 168), language: text(p.language, 'язык', 10), examDate: text(p.examDate, 'дата экзамена', 30) };
    if (!['unknown','secondary','associate','bachelor','gac'].includes(p.education) || !['ru','en'].includes(p.language)) fail('Неизвестное значение профиля');
    if (p.examDate && !/^\d{4}-\d{2}-\d{2}$/.test(p.examDate)) fail('Некорректная дата экзамена');
    if (typeof input.onboarding !== 'boolean') fail('Некорректное поле: onboarding'); d.onboarding = input.onboarding;
    if (!plain(input.settings)) fail('Некорректные настройки'); d.settings = safe(input.settings, 0);
    if (!['foundation','practice','intensive'].includes(d.settings.mode)) fail('Неизвестный режим обучения');
    if(d.settings.studyWeek){var plan=d.settings.studyWeek;if(!plain(plan)||!['practice','intensive'].includes(plan.mode)||!validDate(plan.cycle)||typeof plan.lessonId!=='string')fail('Некорректная активная неделя');}
    ['lessonWork','reviews','templates','sessions'].forEach(function (k) { if (!plain(input[k])) fail('Некорректное поле: ' + k); d[k] = safe(input[k], 0); });
    d.completedLessons = arr(input.completedLessons, 'completedLessons').map(function (x) { return id(x, 'урок'); });
    d.attempts = arr(input.attempts, 'attempts').map(normalizeAttempt);
    ['journal','experience','training','exposures','quarantined'].forEach(function (k) { d[k] = normalizeRecordList(input[k], k); });
    d.journal.forEach(function(r){text(r.note,'запись журнала');if(!Number.isFinite(new Date(r.at).getTime()))fail('Некорректная дата журнала');});
    d.experience.forEach(function(r){text(r.title,'название проекта',200);if(!ym(r.start)||!ym(r.end)||r.start>r.end)fail('Некорректный период опыта');if(r.confirmed!==undefined&&typeof r.confirmed!=='boolean')fail('Некорректное подтверждение опыта');});
    d.training.forEach(function(r){text(r.title,'обучение',300);num(r.hours,'часы обучения',0,10000);if(typeof r.confirmed!=='boolean')fail('Некорректное подтверждение обучения');if(r.date&&!validDate(r.date))fail('Некорректная дата обучения');});
    ['exposures','quarantined'].forEach(function(k){d[k].forEach(function(r){id(r.id);id(r.questionId,'вопрос');});});
    Object.values(d.lessonWork).forEach(function(w){if(!plain(w)||!plain(w.fields)||!Array.isArray(w.revealed)||!w.revealed.every(x=>typeof x==='string'))fail('Некорректный черновик урока');Object.values(w.fields).forEach(v=>text(v,'ответ',5000));});
    Object.values(d.reviews).forEach(function(r){if(!plain(r)||!Number.isFinite(Date.parse(r.dueAt)))fail('Некорректное повторение');num(r.intervalDays,'интервал',1,365);});
    if(d.sessions.quiz){var qz=d.sessions.quiz;if(!plain(qz)||!Array.isArray(qz.questionIds)||!qz.questionIds.every(x=>typeof x==='string')||!Number.isInteger(qz.index)||qz.index<0||qz.index>qz.questionIds.length||typeof qz.finished!=='boolean')fail('Некорректная учебная сессия');['draftAnswers','confidence','assisted','started'].forEach(k=>{if(!plain(qz[k]))fail('Некорректные ответы сессии');});if(!Array.isArray(qz.responseIds)||!qz.responseIds.every(x=>typeof x==='string'))fail('Некорректная история сессии');if(qz.deadline&&!Number.isFinite(Date.parse(qz.deadline)))fail('Некорректный таймер');}
    if (!plain(input.legacy) || !plain(input.legacy.attempts)) fail('Некорректный архив');
    if(d.sessions.quiz) normalizeQuizSession(d.sessions.quiz);
    if(d.sessions.saved !== undefined) {
      if(!plain(d.sessions.saved)) fail('Некорректные сохранённые сессии');
      Object.keys(d.sessions.saved).forEach(function(sessionId){ if(!sessionId || !plain(d.sessions.saved[sessionId]) || d.sessions.saved[sessionId].id !== sessionId) fail('Некорректная сохранённая сессия'); normalizeQuizSession(d.sessions.saved[sessionId]); });
    }
    d.legacy = { attempts: safe(input.legacy.attempts, 0), completedLessons: arr(input.legacy.completedLessons, 'legacy.completedLessons').map(function (x) { return safe(x, 0); }), reviews:safe(input.legacy.reviews || {},0) };
    return d;
  }
  function migrate(raw) {
    if (!plain(raw)) fail('Некорректные данные');
    if (raw.schemaVersion === 2) return validateState(raw.state && plain(raw.state) ? raw.state : raw);
    var v = raw.state && plain(raw.state) ? raw.state : raw;
    if (v.schemaVersion !== 1 && raw.schemaVersion !== 1 && !(v.schemaVersion===undefined && raw.schemaVersion===undefined && plain(v.profile) && plain(v.attempts))) fail('Неподдерживаемая версия данных');
    var d = createState();
    if (plain(v.profile)) Object.keys(d.profile).forEach(function (k) { if (typeof v.profile[k] === typeof d.profile[k]) d.profile[k] = v.profile[k]; });
    ['journal','experience'].forEach(function (k) { if (v[k] !== undefined) d[k] = clone(v[k]); });
    d.onboarding=v.onboarding===true;
    if(v.settings && ['foundation','practice','intensive'].includes(v.settings.mode))d.settings.mode=v.settings.mode;
    d.legacy.attempts = plain(v.attempts) ? clone(v.attempts) : { archived: clone(v.attempts || []) };
    d.legacy.completedLessons = clone(v.completedLessons || []);
    d.legacy.reviews=clone(v.reviews || {});
    return validateState(d);
  }
  function parseImport(source) {
    if (typeof source !== 'string' || source.length > MAX_IMPORT) fail('Файл импорта слишком большой или некорректен');
    var raw; try { raw = JSON.parse(source); } catch (_) { fail('Некорректный JSON импорта'); }
    return migrate(raw);
  }
  function fingerprint(x) {
    if (x === null || typeof x !== 'object') return JSON.stringify(x);
    if (Array.isArray(x)) return '[' + x.map(fingerprint).join(',') + ']';
    return '{' + Object.keys(x).sort().map(function (k) { return JSON.stringify(k) + ':' + fingerprint(x[k]); }).join(',') + '}';
  }
  function unique(items, key) { var seen = {}, out = []; items.forEach(function (x) { var k = key(x); if (!seen[k]) { seen[k] = true; out.push(clone(x)); } }); return out; }
  function mergeState(current, incoming) {
    var a = validateState(current), b = validateState(incoming), out = clone(a);
    out.attempts = unique(a.attempts.concat(b.attempts), function (x) { return 'id:' + x.id; });
    out.completedLessons = unique(a.completedLessons.concat(b.completedLessons), function (x) { return x; });
    ['journal','experience','training','exposures','quarantined'].forEach(function (k) { out[k] = unique(a[k].concat(b[k]), function (x) { return x.id ? 'id:' + x.id : 'fp:' + fingerprint(x); }); });
    ['reviews','lessonWork','templates','sessions'].forEach(function (k) { Object.keys(b[k]).sort().forEach(function (key) { if (!own(out[k], key)) out[k][key] = clone(b[k][key]); }); });
    Object.keys(b.lessonWork).forEach(function(k){var w=out.lessonWork[k],incoming=b.lessonWork[k];Object.keys(incoming.fields).forEach(function(f){if(!w.fields[f]||!w.fields[f].trim())w.fields[f]=incoming.fields[f];});w.revealed=unique(w.revealed.concat(incoming.revealed),x=>x);});
    Object.keys(b.reviews).forEach(function(k){if(a.reviews[k]&&Date.parse(b.reviews[k].dueAt)<Date.parse(a.reviews[k].dueAt))out.reviews[k]=clone(b.reviews[k]);});
    out.sessions.saved=Object.assign({},b.sessions.saved||{},a.sessions.saved||{});
    if(b.sessions.quiz&&!b.sessions.quiz.finished&&a.sessions.quiz&&a.sessions.quiz.id!==b.sessions.quiz.id)out.sessions.saved[b.sessions.quiz.id]=clone(b.sessions.quiz);
    if(a.sessions.quiz&&b.sessions.quiz&&a.sessions.quiz.id===b.sessions.quiz.id){['draftAnswers','confidence','assisted','started'].forEach(function(k){out.sessions.quiz[k]=Object.assign({},b.sessions.quiz[k],a.sessions.quiz[k]);});}
    out.legacy.attempts = Object.assign({}, b.legacy.attempts, a.legacy.attempts);
    out.legacy.reviews = Object.assign({}, b.legacy.reviews, a.legacy.reviews);
    out.legacy.completedLessons = unique(a.legacy.completedLessons.concat(b.legacy.completedLessons), fingerprint);
    return validateState(out);
  }
  function load(storage) {
    var raw = storage.getItem(KEY);
    if (raw !== null) { try { return { state: parseImport(raw), notice: '' }; } catch (e) { return { state: null, notice: 'Данные сохранения повреждены: ' + e.message }; } }
    raw = storage.getItem(LEGACY_KEY);
    if (raw === null) return { state: createState(), notice: '' };
    try { return { state: migrate(JSON.parse(raw)), notice: 'Данные перенесены из старой версии' }; } catch (e) { return { state: null, notice: 'Старые данные повреждены: ' + e.message }; }
  }
  function save(storage, state) { try { storage.setItem(KEY, JSON.stringify(validateState(state))); } catch (_) { fail('Не удалось сохранить данные в браузере'); } }
  function backup(storage, state) { var list = []; try { list = JSON.parse(storage.getItem(BACKUP_KEY) || '[]'); if (!Array.isArray(list)) list = []; } catch (_) {} list.unshift({ savedAt: new Date().toISOString(), state: validateState(state) }); list = list.slice(0, 3); try { storage.setItem(BACKUP_KEY, JSON.stringify(list)); return list; } catch (_) { fail('Не удалось создать резервную копию'); } }
  function setEq(a, b) { if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) return false; var x = {}, y = {}; for (var i=0;i<a.length;i++) { if (!Number.isInteger(a[i]) || x[a[i]]) return false; x[a[i]]=1; if (!Number.isInteger(b[i]) || y[b[i]]) return false; y[b[i]]=1; } return Object.keys(x).every(function(k){return y[k];}); }
  function sameIndexes(a, b) { return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(function (v, i) { return Number.isInteger(v) && v === b[i]; }); }
  function grade(q, answer) {
    if (!q || !q.type) return false;
    if (q.type === 'single' || q.type === 'multi') return setEq(Array.isArray(answer) ? answer : [answer], q.correct);
    if (q.type === 'numeric') { var s = typeof answer === 'number' ? String(answer) : String(answer || '').trim().replace(',', '.'); if (!/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(s)) return false; var n = Number(s); return isFinite(n) && Math.abs(n - q.answer) <= Number(q.tolerance || 0); }
    if (q.type === 'matching') return sameIndexes(answer, q.correct);
    return false;
  }
  function nextReview(previous, remembered, confidence, assisted, now) { var n = new Date(now || Date.now()), days; if (!remembered || assisted) days = 1; else { var prior = previous && previous.intervalDays || 0, ladder=[1,3,7,14,30], idx=ladder.indexOf(prior); days=ladder[Math.min(idx + 1, ladder.length - 1)]; if (confidence <= 1) days = 1; else if (confidence === 2) days = Math.min(days, 3); } n.setDate(n.getDate()+days); return { dueAt:n.toISOString(), intervalDays:days }; }
  function ym(s) { return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? s : null; }
  function countExperienceMonths(records, now) { var today=new Date(now || Date.now()), last=today.getUTCFullYear()*12+today.getUTCMonth(), first=last-119, used={}; arr(records,'experience').forEach(function(r){ if(!plain(r)||r.confirmed!==true) return; var a=ym(r.start), b=ym(r.end); if(!a||!b) fail('Некорректные границы опыта'); var ai=+a.slice(0,4)*12+(+a.slice(5)-1), bi=+b.slice(0,4)*12+(+b.slice(5)-1); if(ai>bi) fail('Некорректные границы опыта'); for(var i=Math.max(ai,first);i<=Math.min(bi,last);i++) used[i]=1; }); return Object.keys(used).length; }
  function remainingSeconds(session, now) { var deadline=session && new Date(session.deadline).getTime(), current=new Date(now || Date.now()).getTime(); if (!isFinite(deadline) || !isFinite(current)) return 0; return Math.max(0, Math.ceil((deadline-current)/1000)); }
  function readiness(bank, attempts) {
    var byId=new Map((bank||[]).map(q=>[q.id,q])), families=new Set(), first=[];
    (attempts||[]).slice().sort((a,b)=>Date.parse(a.answeredAt)-Date.parse(b.answeredAt)||a.id.localeCompare(b.id)).forEach(a=>{var q=byId.get(a.questionId);if(!q||!['model_reviewed','expert_reviewed'].includes(q.status)||q.version!==a.questionVersion)return;var f=q.scenarioFamilyId;if(families.has(f))return;families.add(f);if(!a.assisted)first.push(a);});
    var correct=first.filter(a=>a.correct).length;
    return {eligible:first.length,correct:correct,sufficient:first.length>=20,score:first.length?Math.round(correct*100/first.length):0};
  }
  function selectQuestions(bank, seenFamilies, count, weights, requireReserve=true) {
    var seen=new Set(seenFamilies||[]), domains=Object.keys(weights||{}), total=domains.reduce((s,d)=>s+weights[d],0), quotas={},fractions=[];
    if(!Number.isInteger(count)||count<1||!domains.length||!Number.isFinite(total)||total<=0||domains.some(d=>weights[d]<0))return {questions:[],missing:{request:count},byDomain:{}};
    domains.forEach(d=>{var exact=count*weights[d]/total;quotas[d]=Math.floor(exact);fractions.push([d,exact-quotas[d]]);});
    fractions.sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    var leftover=count-domains.reduce((s,d)=>s+quotas[d],0);
    for(var i=0;i<leftover;i++)quotas[fractions[i][0]]++;
    var pool=(bank||[]).filter(q=>['model_reviewed','expert_reviewed'].includes(q.status)&&(!requireReserve||q.reserve===true)&&q.scenarioFamilyId&&!seen.has(q.scenarioFamilyId));
    // Match domain slots to scenario families. A family can occupy only one slot, even across domains.
    var slots=domains.flatMap(d=>Array.from({length:quotas[d]},()=>d)),owner=new Map(),picked=new Map();
    function match(slot,visited){for(var q of pool.filter(q=>q.eco&&q.eco.domain===slots[slot])){var f=q.scenarioFamilyId;if(visited.has(f))continue;visited.add(f);if(!owner.has(f)||match(owner.get(f),visited)){owner.set(f,slot);picked.set(slot,q);return true;}}return false;}
    slots.forEach((_,i)=>match(i,new Set()));
    var byDomain=Object.fromEntries(domains.map(d=>[d,0])),missing={};picked.forEach((q,slot)=>byDomain[slots[slot]]++);
    domains.forEach(d=>{if(byDomain[d]<quotas[d])missing[d]=quotas[d]-byDomain[d];});
    return {questions:Object.keys(missing).length?[]:[...picked.entries()].sort((a,b)=>a[0]-b[0]).map(x=>clone(x[1])),missing,byDomain};
  }
  function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
  function countTrainingHours(records,now){var today=new Date(now||Date.now()).toISOString().slice(0,10);return records.reduce((sum,r)=>sum+(r.confirmed&&validDate(r.date)&&r.date<=today?r.hours:0),0);}
  var api={KEY:KEY,LEGACY_KEY:LEGACY_KEY,BACKUP_KEY:BACKUP_KEY,createState:createState,validateState:validateState,migrate:migrate,parseImport:parseImport,mergeState:mergeState,load:load,save:save,backup:backup,grade:grade,nextReview:nextReview,countExperienceMonths:countExperienceMonths,countTrainingHours:countTrainingHours,remainingSeconds:remainingSeconds,readiness:readiness,selectQuestions:selectQuestions};
  root.PMPCore=api; if(typeof module!=='undefined'&&module.exports) module.exports=api;
}(typeof globalThis!=='undefined'?globalThis:this));
