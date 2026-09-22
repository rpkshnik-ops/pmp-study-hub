# Browser regression remediation, 2026.3

Date: 2026-09-22

## Updated coverage

- The browser suite reads every scored answer from the active session's `questionSnapshots`, verifies the displayed question ID, and therefore follows the persisted shuffled option order.
- The suite verifies 24 lessons with 8 questions, 6 linked three-question cases, and the normal-practice split of 5 non-case questions for case lessons and 8 for other lessons.
- A numeric question is selected from the actual current bank. Its active numeric draft is parked and resumed without assuming a particular question ID or value.
- L01 lab coverage checks the data table, initially closed solution, autosave after reload, incomplete rubric gate, self-rubric completion, and Markdown export containing the source table.
- L03 case coverage checks shared data, three saved snapshots across reload, deferred feedback after the first response, and absence of the correct option in Progress and Review before case completion.
- The course map is checked for 7 PMBOK domains and 26 ECO tasks. At 375 px, L15 and L21 lab tables and charts must fit the viewport.
- The complete path also checks cached `study.js`, the L01 lab, and L03 transfer case while offline.

## Verification on this revision

`python -m py_compile browser_check.py` passed.

`python browser_check.py` passed all unscored checks and reported:

```text
SKIP browser scored flows: all 2026.3 questions remain draft pending peer review.
```

This is intentional: `study.js` excludes `draft` questions from scored sessions. The check does not alter package statuses. After peer review marks the bank eligible, rerun `python browser_check.py` to execute the saved-session, case, numeric, backup, offline, and restart flows.

## Integration by root

The development-only early return was removed: the release suite now fails when content is unreviewed instead of returning success after partial coverage. Root removed a duplicated lab-completion block, corrected the route for the offline saved-answer assertion, and restored the actual submission assertion after numeric park/resume. The deferred-case test now uses a wrong answer and verifies that review cards are not scheduled until completion. Offline testing includes a scored linked case and reload. An original v2 question fixture tests continuing a saved v2 session, preserving old learner fields and completion, and recognizing the same family when opening v3.

The final full-run result is recorded in TESTING.md after content review; the partial development run above is not a release pass.
# Итоговый прогон основной сессии

22.09.2026 после завершения обеих предметных рецензий и исправления интеграционных замечаний выполнены `python tools/release.py --write` и `python verify.py --browser`. **PASS: 38 модульных тестов, содержательные структурные проверки, полный браузерный сценарий без пропуска основной части.** Дополнительно проверены настоящий снимок вопроса версии 2 и старый черновик без снимка; просмотрены `tests/lab-mobile.png` и `tests/case-desktop.png`. Подробности — `TESTING.md`.
