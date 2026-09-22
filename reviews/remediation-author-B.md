# Авторская запись B: исправление L13–L24

Дата: 22 сентября 2026 года. Scope: `content/pack-04.json`–`content/pack-06.json`, уроки L13–L24. Все изменённые уроки и вопросы оставлены в статусе `draft` до независимой рецензии.

## Что изменено

- L13: пять Scrum values как наблюдаемое поведение; backlog refinement как деятельность; различие изменения Sprint Backlog, сохранения Sprint Goal и отмены Sprint Product Owner.
- L14–L16: относительная оценка, burnup/burndown, диапазон release forecast, throughput/percentile/SLE, зависимости гибридного релиза, governance gates и проверяемый tailoring.
- L17: appetite/tolerance/threshold, EMV, contingency и management reserve, aggregate risk, residual/secondary risk и effectiveness audit.
- L18: make-or-buy, SOW/RFP, source selection, contract types и распределение риска, переговоры/BATNA, contract change, claims, acceptance и closure. FAR пояснён как открытый пример федеральной закупки США, а не универсальная процедура PMP.
- L19: impact/readiness assessment, sponsor coalition, local champions, feedback, resistance as data, reinforcement и цепочка delivery–adoption–benefit. Это прямое учебное покрытие Business Environment Task 7.
- L20: проверка внешнего сигнала, пересмотр business case и варианты continue/change/pause/stop для Business Environment Task 8; применение AI самим PM с data/IP/confidentiality, provenance, human verification, model change и accountability; sustainability trade-offs через scope, procurement, finance, quality, risk и benefits.
- L21: Cost of Quality, prevention/appraisal/failure, sampling, specification и control limits, process capability, Pareto/RCA и continuous improvement.
- L22: phase/project/contract closure, stopped project, disputed claim, reserve/resource release, records retention/legal hold, benefit handoff и применимые lessons learned.
- L23: интеграционное решение по противоречивым schedule, cost, quality, contract, adoption, sustainability, risk и benefit данным.
- L24: Q24-1–Q24-3 заменены предметными задачами по EMV, quality acceptance и residual exposure. Учебная готовность больше не выдаётся за ECO Process Task 9.

В каждом уроке добавлен отдельный `lab` с исходной таблицей не менее трёх строк, пятью предметными шагами, тремя связанными prompts, развёрнутым решением с условиями пересмотра и наблюдаемой рубрикой. L15 и L21 содержат точные bar charts из чисел практикума. В L16, L18 и L23 добавлены `caseStudy`; Qxx-6…8 каждого такого урока используют общий `caseId`, позиции 1–3 и одну семью сценария.

## Вопросы

- Переработаны все 60 прежних Q13-1…Q24-5: сохранены ID, тип вопроса и прежний `scenarioFamilyId`; заменены prompt/options/explanations, прежние поля рецензии удалены.
- Добавлены 36 вопросов Qxx-6…8. Всего в scope 96 учебных вопросов, `reserve:false`, версия 3, статус `draft`.
- Типы: 67 single, 13 multi, 11 matching, 5 numeric. Сложность: 39 application и 57 analysis.
- Контексты: 48 SAP и 48 другие отрасли/организации.
- Multi явно требуют выбрать два или три ответа. Пять наборов ключей; правильные позиции встречаются: 0 — 6, 1 — 7, 2 — 10, 3 — 8 раз. Первая позиция верна в 6 из 13 multi, а не во всех.
- Strictly-longest correct среди single: pack-04 — 4/21 (19,0%), pack-05 — 1/23 (4,3%), pack-06 — 3/23 (13,0%). Общий результат B — 8/67 (11,9%). Короткие ключи содержат решение, подробная аргументация находится в explanations; дистракторы ошибаются по роли, порядку, полномочию, допущению или evidence.
- Прямые метки Business Environment Task 7 и Task 8 назначены только вопросам, где content действительно проверяет organizational change или внешний сигнал. Наличие метки не считается доказательством полного освоения ECO.

## Проверенные расчёты

- L14 release forecast: 104 points / velocity 16–24 с округлением вверх, отдельный Sprint интеграции и sensitivity для +8/+13 points.
- L15: 28 и 36 элементов при throughput 5/7/9, совместная интерпретация WIP, blocked work и throughput.
- L16: 2–3 двухнедельных Sprint плюс последовательная сертификация 30–45 дней; equipment path проверен отдельно и в сценарии +15 дней.
- L17: A = 0,30×600 + 0,15×300 = 225 тыс. ₽; B = 120 + 0,10×600 + 0,08×300 = 204 тыс. ₽. При вероятности задержки B 18% итог 252 тыс. ₽ и threshold 15% нарушен.
- L18 source selection. Явная учебная шкала: `tech/100`, `8/price`, `15/weeks`, risk A/B/C = 0,4/0,8/0,6. При весах 45/25/20/10: A 0,8257; B 0,9069; C 0,8734. При risk 20% и прочих весах ×8/9: A 0,7784; B 0,8950; C 0,8430. B лидирует только при этих допущениях; шкала не объявлена формулой PMI.
- L19 учебная эвристика priority: `(5−readiness)+cycle/7+impact` даёт Север 3,29; Юг 7,00; Центр 5,00; ИТ 0. Формула прямо названа локальной эвристикой, не правилом PMI.
- L21: до prevention failure cost 40×8 + 15×80 = 1 520 тыс. ₽; после 20×8 + 5×80 + 500 = 1 060 тыс. ₽. Добавлены sensitivity 40/80/120 тыс. ₽ за external failure и break-even prevention 960 тыс. ₽.
- L22: отдельно сравниваются cancellation fee 1,5/3,0 млн ₽ и net completion cost 2,2−1,0 = 1,2 млн ₽; claim 4,2 млн ₽ не считается автоматически принятым.
- L24: без ответа EMV = 20%×5 = 1,0 млн ₽; с ответом = 0,4 + 8%×5 = 0,8 млн ₽. Sensitivity для impact 3/5/8 млн ₽ показывает, когда экономический вывод меняется; risk threshold применяется отдельно.

## Новые источники для реестра config

| ID | Название / URL | Использованные разделы |
|---|---|---|
| `FAR` | Federal Acquisition Regulation, https://www.acquisition.gov/browse/index/far | Parts 15.3, 16, 33.2, 46: source selection, contract types, disputes/appeals, quality assurance. В тексте обозначен как пример системы закупки США. |
| `ASQ-COQ` | ASQ — Cost of Quality, https://asq.org/quality-resources/cost-of-quality | Prevention, appraisal, internal failure, external failure. |
| `NIST-SEMATECH` | NIST/SEMATECH e-Handbook of Statistical Methods, https://www.itl.nist.gov/div898/handbook/ | 6.1.6 process capability; 6.3 control charts. Прямые страницы: `.../pmc/section1/pmc16.htm`, `.../pmc/section3/pmc3.htm`. |

Существующие источники использованы с конкретными разделами: `SCRUM-2020`, `KANBAN-GUIDE`, `GAO-SCHEDULE`, `GAO-COST`, `NIST-AI`, `PMI-ECO-2026`. ECO применяется для задач/enablers и границы содержания, но не как первоисточник формул EMV, CoQ или control charts.

## Спорные места и границы

- EMV является ожидаемым значением, а не обещанием фактической стоимости. Корреляция и общая причина требуют aggregate analysis; contingency не равняется механической сумме worst case.
- Story points и velocity локальны для команды. Диапазоны в практикуме — учебные сценарии при стабильном Definition of Done и сопоставимой работе.
- В source selection нормирование и risk scores являются явно заданной учебной моделью. Иная допустимая шкала может изменить порядок поставщиков.
- Control limits описывают поведение процесса, specification limits — требование. Три точки или один bar chart не дают надёжной контрольной карты и не доказывают причинность.
- В organizational change количественный priority score — инструмент обсуждения, а не стандарт PMI. Решение опирается также на качественные барьеры, культуру и полномочия.
- В sustainability обязательный compliance threshold не усредняется с NPV или energy весами. Lifecycle boundary и достоверность supplier data могут изменить решение.

## Авторская проверка

- JSON всех трёх пакетов загружается; schemaVersion 2, версии пакетов/уроков/вопросов 3.
- В каждом уроке ровно 8 вопросов; 96 уникальных ID. Сохранены все 60 прежних scenario families и типы прежних вопросов.
- Сохранены количество и ID карточек. У изменённых уроков/вопросов нет `reviewedBy`, `reviewModel`, `reviewDate`.
- В L16/L18/L23 проверены `caseId`, `casePosition` 1/2/3 и общая family для трёх вопросов.
- Выполнены загрузка JSON и отдельный набор Python assertions для scope B: версии/статусы, 8 вопросов на урок, уникальные ID, сохранение прежних ID/типов/families, структура 12 labs и трёх связанных case sets, поля ответов и sourceRefs. Отдельно пересчитаны редакционные метрики длины и multi-key. Полный `check_curriculum` сейчас намеренно не запускался: его gate требует статус `model_reviewed`, который можно присвоить только после независимой peer review. Release/browser gate выполняет основная сессия после интеграции.
