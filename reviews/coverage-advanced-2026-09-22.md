# Независимый аудит глубины курса: L13–L24 и банк 120 вопросов

Дата: 22 сентября 2026 года. Объект: `content/pack-04.json`–`content/pack-06.json` полностью и `prompt/options` всех 120 вопросов `content/pack-01.json`–`content/pack-06.json`. Это содержательный аудит покрытия и диагностической силы, без изменения уроков, вопросов, кода или статусов.

## Источники и граница вывода

- [PMBOK® Guide — Eighth Edition, официальная страница PMI](https://www.pmi.org/standards/pmbok): 408 страниц, ноябрь 2025 года; PMI публично указывает шесть принципов, семь performance domains и расширение тем AI, PMO и procurement.
- [Официальное оглавление PMBOK® Guide — Eighth Edition](https://www.pmi.org/-/media/pmi/documents/public/pdf/publications/pmbok-guide-eighth-edition_table-of-contents.pdf): использовано для проверки публичной структуры, включая семь доменов, tailoring, inputs/outputs, tools and techniques и приложения по AI и procurement.
- [PMP® Examination Content Outline 2026, revised 11 August 2026](https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/pmp/pmp-examination-content-outline.pdf?rev=b8e1618215b74dfc926f5b406567f072): использованы доли доменов, все tasks/enablers, соотношение подходов и официально опубликованные типы заданий.
- [Scrum Guide 2020](https://scrumguides.org/scrum-guide.html): использован только для проверки конкретной неоднозначности Sprint Goal.

Полный текст PMBOK 8 в этой проверке не был доступен как открытый полный источник: публичная страница ведёт к загрузке/приобретению, а открытое оглавление содержит структуру, но не содержание 408 страниц. Поэтому ниже нет утверждения о постраничной эквивалентности курсу. Сравнение с PMBOK 8 ограничено официальной публичной структурой и описанием издателя; сравнение с ECO 2026 возможно по полному открытому outline.

Не использовались реальные защищённые экзаменационные задания и не делались предположения о секретном банке PMI. Формат сравнивался только с открытым ECO 2026. Старые публичные sample questions не использовались как калибровка экзамена июля 2026 года.

## Краткий вывод

L13–L24 — хороший прикладной учебный цикл уровня «понять и применить основной механизм». Особенно сильны границы полномочий, различение риска/проблемы/дефекта/изменения, цепочка поставка–использование–польза, UAT/go-no-go и передача в эксплуатацию. Материал регулярно требует наблюдаемого доказательства и не обещает экзаменационный результат.

Это ещё не полное освоение PMBOK 8 или PMP ECO 2026. Procurement, количественный risk, governance design, quality methods, AI в работе руководителя проекта и системная sustainability представлены как первый контакт или один прикладной сценарий. Agile хорошо покрывает ядро Scrum/Kanban, но заголовок L13 «полная система Scrum» шире фактического содержания. Отдельный заметный пробел всего курса — organizational change/adoption как самостоятельная управленческая работа.

Банк из 120 вопросов нельзя использовать как надёжное доказательство готовности: форма почти раскрывает ключ. В 69 из 73 single-response правильный вариант — единственный самый длинный; все 23 multi-response включают правильной опцию 0, 22 из 23 — опцию 1. Анализ prompt и структуры заданий не обнаружил ни одного связанного case set, хотя ECO 2026 прямо публикует формат серии вопросов по одному кейсу; уникальные 120 из 120 `scenarioFamilyId` согласуются с этим наблюдением, но сами по себе его не доказывают.

## Шкала глубины

- **Сильное прикладное покрытие**: тема объяснена через механизм, границы, исключения, артефакт и несколько переносных решений.
- **Рабочее ядро**: основной цикл решений освоить можно, но существенная часть публичной структуры/ECO остаётся за пределами урока.
- **Первый контакт**: ученик узнает термины и один сценарий, но ещё не готов выбирать среди широкого набора методов и сложных данных.

## Тематическая оценка L13–L24

| Тема | Фактическое покрытие | Оценка глубины | Что ещё нужно для полного освоения |
|---|---|---|---|
| Agile | L13 даёт pillars, accountabilities, events, artifacts/commitments и DoD; L14 — user stories, acceptance criteria, ordering и vertical slicing; L15 — Definition of Workflow, WIP и четыре flow metrics. Q13-1/Q13-4/Q13-5, Q14-4/Q14-5 и Q15-3/Q15-4 проверяют разные механизмы. | **Рабочее ядро, местами сильное.** | Scrum values, границы изменения Sprint Goal и cancellation, backlog refinement как деятельность, adaptive estimation/release planning, burnup/burndown и более широкий набор adaptive practices. Название L13 «полная система Scrum» следует считать обещанием большей глубины, чем фактически дано. |
| Hybrid/tailoring | L16 делит потоки по неопределённости, цене изменения и обязательным воротам; L23 соединяет ценность, факты, риск, качество, права и доказательство. Q16-1/Q16-2/Q16-5 и Q23-2/Q23-3 хорошо проверяют границы решений. | **Сильное прикладное покрытие.** | Больше вариантов tailoring на уровне организации, процесса и engagement; диагностика неудачного tailoring; несколько длинных кейсов, где подход меняется по новым данным. |
| Risk/issues | L17 точно разводит risk/issue, cause-event-effect, trigger, response, residual risk, opportunity и escalation. Q17-3 проверяет виды ответа, Q17-5 — срабатывание trigger. | **Рабочее ядро.** | Risk management plan, categories/RBS, risk appetite/tolerance/thresholds, aggregate project risk, quantitative analysis, EMV/decision tree/Monte Carlo, связь contingency/management reserve с финансами, risk audit и эффективность ответа. Сейчас даже пример `3×4` упомянут, но метод не отрабатывается. |
| Governance/change | L16, L18 и L23 последовательно различают право упорядочить backlog, изменить baseline/budget и разрешить эксплуатацию; Q16-2/Q16-5, Q18-1/Q18-4 и Q23-4 закрепляют это. | **Рабочее ядро.** | Проектирование governance model, success metrics и mechanisms, assurance/audit, escalation thresholds как целая схема, связь с organizational governance, portfolio/program/PMO, OPA/EEF. Публичный TOC PMBOK 8 выделяет Governance отдельным performance domain и PMO отдельным приложением. |
| Procurement | L18 объясняет make-or-buy на уровне вопроса, приёмку, supplier performance и closure; упоминает fixed price и time-based contract. Q18-3 — базовое сопоставление фаз, Q18-5 — отказ от приёмки при непройденных ролях. | **Первый контакт.** | Procurement strategy, SOW/RFP/bid documents, market/source analysis, source selection criteria, полный набор contract models и распределение риска, negotiation strategy, vendor governance, claims/disputes и contract change control. Это особенно заметно против отдельного приложения PMBOK 8 X4 и десяти enablers Process Task 5 ECO. |
| Business/value | L19 хорошо строит business case, alternatives, lifecycle cost, baseline, adoption и benefit owner; Q19-1 различает использование и эффект, Q19-4 — причинность, Q19-5 — sunk cost. | **Сильное прикладное покрытие benefits.** | Product/portfolio linkage, market and external-environment scanning, value realization across several releases, organizational change readiness/adoption, culture and resistance mechanisms. ECO Business Environment Tasks 7–8 раскрыты слабее, чем benefits. |
| Quality/UAT | L21 ясно разводит quality, acceptance, UAT и go/no-go; L07, L13 и L14 добавляют prevention, DoD и acceptance criteria. Q21-3 и Q21-5 требуют разных доказательств. | **Рабочее ядро.** | Cost of quality, sampling, quality metrics, tolerances versus control limits, control charts, root-cause/process analysis, design for quality и системный continuous improvement. ECO Process Task 7 прямо включает CoQ и ongoing reviews; в вопросах этого нет. |
| Closure/transition | L22 охватывает operational ownership, knowledge demonstration, hypercare, open defects, procurement/finance/access closure, benefit handoff и actionable lessons. Q22-3/Q22-5 хорошо разводят закрытие и будущую пользу. | **Сильное прикладное покрытие.** | Отдельные scored cases по phase closure, cancelled project, records retention/legal archive, release of reserves/resources и спорной contract closure. Эти варианты есть в тексте, но почти не проверяются. |
| AI | L20 корректно представляет NIST AI RMF как добровольную рамку, рассматривает data quality, group harms, human oversight и stop trigger. Q20-1–Q20-3 проверяют статус рамки и четыре функции. | **Первый контакт.** | PMBOK 8 публично выделяет AI in project context, adoption strategies, common use cases и responsible use. Курс почти полностью рассматривает AI как риск продукта; не хватает применения AI самим PM, проверки generated output, confidentiality/IP, hallucination, provenance, vendor/model change и human accountability в project work. |
| Sustainability | L20 рассматривает lifecycle boundary и экологические, социальные и экономические последствия; Q20-4 — единственный прямой scored sustainability case. Q23 упоминает отчёт о выбросах лишь как change request. | **Первый контакт.** | Интеграция sustainability в scope, schedule, finance, procurement, quality, risk и governance; показатели и trade-offs по нескольким контрольным точкам; supplier sustainability и benefit ownership. PMBOK 8 делает sustainability одним из шести principles, а ECO упоминает её в planning, quality, compliance и risk. |

## Точки, где формируется только первое знакомство

Ниже перечислены места, после которых нужна дополнительная учебная работа, даже если ученик правильно ответил на текущие вопросы.

1. **Procurement:** L18 и Q18-3/Q18-5 дают фазы и приёмку, но не проверяют выбор contract type, bid/source selection, переговоры и claims. Правильный ответ на Q18-3 означает узнавание трёх фаз, а не владение Process Task 5.
2. **Quantitative risk:** L17 и Q17-2/Q17-3/Q17-5 хорошо проверяют trigger/owner/response, но ни один вопрос не требует количественной модели, резерва или совокупного риска проекта.
3. **Governance design:** Q16-2/Q16-5 и Q18-4 учат следовать уже заданным правам. Они не требуют спроектировать governance structure, success metrics, thresholds и reporting mechanisms, как требует Business Environment Task 1.
4. **Quality methods:** Q07-3/Q07-4 и Q21-1–Q21-5 учат не выпускать непроверенное и правильно классифицировать дефект. Ни один вопрос не требует CoQ, sampling, control chart или анализа причин процесса.
5. **AI:** Q20-1–Q20-3 подтверждают знание NIST AI RMF и responsible-AI минимум. Нет задачи, где PM выбирает допустимое применение генеративного AI, проверяет результат и управляет данными/авторством/трассируемостью.
6. **Sustainability:** Q20-4 проверяет один trade-off «бумага–поездки–доступность». Одного вопроса недостаточно для принципа «integrate sustainability within all project areas».
7. **Organizational change:** L19 говорит об использовании результата, L22 — о передаче, однако нет полного change adoption cycle: impact/readiness, sponsor coalition, local champions, resistance feedback, reinforcement и measurement. Это слабое место относительно ECO Business Environment Task 7.
8. **Agile breadth:** Q13–Q15 хорошо проверяют Scrum/Kanban основы, но не дают практики adaptive estimation/release forecast, values и нескольких конкурирующих adaptive методов.

## Две содержательные неоднозначности

### Sprint Goal в L18

L18, раздел «Решение меняет документы и действия», говорит: «В адаптивной части обновите Product Backlog и Sprint Goal только по правилам команды». Без указания момента это можно прочитать как обычное изменение Sprint Goal внутри текущего Sprint. Scrum Guide 2020 говорит, что во время Sprint нельзя вносить изменения, ставящие Sprint Goal под угрозу; scope Sprint Backlog можно уточнять и пересогласовывать без воздействия на Sprint Goal, а устаревший Sprint Goal даёт Product Owner право отменить Sprint. Для обучения безопаснее явно разделять: Product Backlog можно переупорядочить; scope текущего Sprint можно пересогласовать вокруг Goal; obsolete Goal ведёт к рассмотрению cancellation, а не к обычному «обновлению цели».

### ECO-метки L24/Q24

L24 и Q24-1/Q24-2/Q24-3 помечены `Process Task 9 — Evaluate project status`, но проверяют retrieval practice, личную готовность и арифметику темпа экзамена. В ECO Task 9 относится к project metrics, artifacts, current progress и reporting. Личная учебная готовность — полезная метакогнитивная тема, но не доказательство покрытия Task 9. Q24-4 (наступившая проблема) и Q24-5 (compliance/safety route) имеют содержательные ECO-связи; первые три следует учитывать отдельно от blueprint. Аналогично все Q20 помечены compliance: для Q20-3 (таксономия NIST AI RMF) и Q20-4 (добровольный sustainability trade-off) эта связь слишком широкая и искусственно увеличивает видимое покрытие Business Environment Task 2.

## Аудит всех 120 вопросов

### Состав банка

| Разрез | Результат |
|---|---:|
| Всего | 120 |
| Single response | 73 |
| Multiple response | 23 |
| Matching | 18 |
| Numeric | 6 |
| Foundation / application / analysis | 36 / 42 / 42 |
| People / Process / Business Environment | 24 / 66 / 30 |
| Predictive / agile / hybrid | 29 / 24 / 67 |
| Уникальные `scenarioFamilyId` | 120 из 120 |

Плюсы: позиции правильного ответа в single распределены достаточно ровно (`0:15`, `1:20`, `2:21`, `3:17`); есть отрасли помимо SAP; 84 из 120 вопросов помечены application/analysis. ECO 2026 задаёт 33% People, 41% Process, 26% Business Environment и примерно 40% predictive против 60% adaptive/agile+hybrid. Фактические 20%/55%/25% и 24.2%/75.8% показывают дефицит People и predictive practice, даже до проверки корректности ECO-меток.

### Критическая подсказка длиной ответа

В 69 из 73 single-response (94.5%) правильная опция является единственной самой длинной строкой по Python `len`. Средняя длина правильной опции — 75.4 символа, неправильной — 37.2. Это воспроизводимая подсказка независимо от знания PMP.

Примеры:

- Q07-2: правильный вариант подробно перечисляет «приоритет, альтернативный ресурс или последовательность и пересчитать срок и стоимость», а три дистрактора коротки и явно непрофессиональны.
- Q24-5: правильный вариант — единственный длинный процесс из подтверждения, safety route и authorized decision; остальные предлагают рекламу, короткий ответ или сокрытие.
- Та же конструкция повторяется в Q13-2, Q17-4, Q18-1, Q21-5 и многих других.

Следствие: даже честный высокий балл может измерять навык распознавать редакторскую форму. Пока этот эффект не снят, нельзя использовать банк для заявления «тема освоена» или калибровки готовности.

### Шаблон multiple response

Все 23 multi-response имеют ровно четыре опции. Наборы ключей:

- `[0,1,3]` — 14 раз;
- `[0,1,2]` — 8 раз;
- `[0,2]` — 1 раз.

Таким образом, опция 0 правильна в 23/23, опция 1 — в 22/23. Обычно это «три разумные практики плюс одна очевидно плохая». Ученик быстро выучит шаблон без освоения темы. Нужны разное число правильных ответов, разные позиции, несколько правдоподобных действий и явная инструкция «выберите N», если интерфейс не показывает количество.

### Слабые дистракторы

Консервативный поиск по неправильным опциям нашёл 56 из 243 (23.0%) с подсказочными основами вроде «скрыть», «удалить», «игнорировать», «молча», «автоматически», «всегда/никогда», «без оценки/проверки», «100%», «отменить». Примеры: Q04-3 «добавить без оценки», Q15-5 «начать скрыто вне доски», Q19-4 «удалить исходные данные», Q21-5 «всё зелёное, чтобы не тревожить бизнес». Это почти никогда не конкурентоспособные PMP-решения.

Хороший дистрактор должен быть профессионально правдоподобен, но ошибочен из-за последовательности, роли, пропущенного ограничения или неполного доказательства. Сейчас многие вопросы позволяют выбрать единственный этичный и подробный текст.

### Сложность вычислений и данных

Шесть numeric items — Q06-1, Q06-2, Q08-1, Q08-2, Q15-1 и Q24-3. Это одношаговые critical-path/float, CPI/SV, календарные дни и экзаменационный средний темп. Нет задания с графиком, таблицей изменений, несколькими зависимостями, выбором допущения или противоречивыми метриками. Номинальная метка `analysis` у текстовых вопросов часто означает правильный принцип в одном абзаце, а не анализ набора данных.

### Нет связанных кейсов и нескольких конкурирующих решений

Анализ prompt и структуры всех 120 вопросов не нашёл серии, где один общий business/project scenario порождает несколько вопросов, а новая информация меняет последующее решение. Все 120 `scenarioFamilyId` также уникальны; это дополнительный структурный сигнал, а не самостоятельное доказательство отсутствия связанного сюжета. L23 является хорошим учебным сквозным разбором, но его пять scored questions используют отдельные ситуации и не образуют один scored case set.

Есть 23 multiple-response items, однако они проверяют перечисление нескольких хороших практик. Почти нет single-response items, где две опции обе разумны, но одна лучше из-за слова «first/next», полномочий, срочности или недостающего evidence. Это ограничивает перенос на реальные неоднозначные ситуации.

### Сопоставление с открытыми форматами ECO 2026

ECO 2026 официально перечисляет: case/scenario с серией вопросов, enhanced matching, graphic-based, single response, multiple response, point-and-click, matching, pull-down list; обзор формата также упоминает practicum hands-on testing с tools, data и case study questions. Текущий банк покрывает single response, multiple response и базовое matching. Numeric может тренировать расчёт, но не воспроизводит опубликованный graphic/practicum формат.

Просмотрены и открытые иллюстрации формата в самом ECO: текстовый scenario об инициативе smart home и задание, где ответ извлекается из Requirements Traceability Matrix вместе с выдержкой из project plan. Одна иллюстрация не позволяет статистически сравнивать сложность дистракторов, но вторая прямо показывает недостающий в курсе навык чтения табличного проектного артефакта.

Отсутствуют:

- case/scenario set с несколькими зависимыми вопросами;
- графики/диаграммы как необходимый источник ответа;
- enhanced matching с диаграммой;
- point-and-click/hotspot;
- отдельные контекстные pull-down задания; технический `select`, используемый интерфейсом matching, не создаёт item design, где выбор из выпадающего списка является частью общего сценария или артефакта;
- hands-on работа с таблицей, backlog, risk register, schedule или dashboard.

Не каждый формат обязан встречаться в каждом экзаменационном варианте, и ECO прямо предупреждает о вариативности. Но тренажёр, претендующий на полноту подготовки, должен дать знакомство с каждым публично объявленным форматом, не копируя защищённые задания.

## Приоритетный план углубления

### P0 — восстановить диагностическую валидность

1. Переписать single-response так, чтобы длина и детализация не раскрывали ключ; ограничить правильную и неправильные опции сопоставимым объёмом.
2. Перестроить multi-response: перемешать позиции, варьировать число правильных, убрать схему «три хорошие + одна плохая».
3. Заменить дистракторы «скрыть/игнорировать/удалить» на правдоподобные альтернативы с ошибкой роли, порядка или доказательства.
4. Создать 4–6 связанных case sets по 3–5 вопросов: hybrid release, supplier/risk, benefit/adoption, AI/compliance, closure. В каждом добавлять новую информацию между вопросами.
5. Добавить chart/table/diagram items и практическую работу с артефактом; отдельно дать обзор всех публичных форматов ECO.
6. Исключить Q24-1–Q24-3 из расчёта ECO Task 9 и показывать их как study-readiness items.

### P1 — закрыть содержательные пробелы

1. **Procurement lab:** make-or-buy, procurement strategy, SOW/RFP, source selection, contract models/risk allocation, negotiation, performance, claims, closure.
2. **Risk lab:** RBS, appetite/thresholds, qualitative scales, EMV/decision tree, reserve, aggregate risk и monitoring effectiveness.
3. **Governance and organizational change:** governance model/metrics/thresholds, PMO/OPA/EEF, readiness/impact/adoption/reinforcement.
4. **Quality methods:** CoQ, process metrics, control limits, sampling, RCA и continuous improvement.
5. **AI for project work:** допустимые use cases, data/IP/confidentiality, output verification, hallucination/provenance, accountability и monitoring model change.
6. **Sustainability across domains:** один связанный кейс, где sustainability меняет scope, procurement, finance, risk, quality и benefit plan.

### P2 — углубить уже сильные блоки

1. Расширить Agile за Scrum/Kanban: values, Sprint Goal boundary/cancellation, adaptive estimation, release forecast и сравнение практик.
2. Для closure добавить stopped-project и disputed-contract кейсы.
3. Для business/value добавить полный organizational adoption case и внешний market/regulatory change, меняющий business case.

## Итоговая оценка полноты

Курс можно считать сильной прикладной основой и качественным мостом от терминов к управленческому рассуждению. По L13–L24 ученик получает правильные привычки: отделять факт от предположения, проверять полномочия, не называть непроверенное готовым и связывать поставку с наблюдаемой пользой.

Курс пока нельзя считать полным освоением PMBOK 8 или достаточным самостоятельным доказательством PMP readiness. Ограничение состоит не только в числе тем. Procurement, quantitative risk, governance design, quality analytics, organizational change, AI use in project work и cross-domain sustainability требуют новых учебных блоков. Текущий вопросный банк дополнительно завышает ощущение освоения из-за длины правильного ответа, повторяющихся multi-response ключей, слабых дистракторов и отсутствия связанных/графических/practicum форматов.

P0 устранит выявленные формальные подсказки и даст основу для дальнейшей проверки. Диагностическую валидность после этого всё равно нужно подтвердить экспертной рецензией, пилотом на целевой аудитории и анализом статистики заданий. После P1 курс приблизится к заявке на системное покрытие публичного ECO 2026 и структуры PMBOK 8; полную эквивалентность 408-страничной книге можно подтверждать только по доступному полному тексту и экспертной проверке.
