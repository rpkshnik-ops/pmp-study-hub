# Architecture decision — 2026-09-18

## Content remediation 2.2 — 2026-09-22

The PMBOK/ECO audit required both richer tasks and changes in assessment behavior. `study.js` now handles approved content selection, case stimuli and shuffled immutable question snapshots. `core.js` validates those snapshots and the case session structure; `learning.js` aggregates linked questions as one scenario. `app.js` renders tables, accessible SVG charts, labs and the public coverage map. The application stays offline and uses the same schema v2 storage key.

Every lesson has a separate data lab with three saved open responses, a hidden worked solution and explicit self-assessment criteria. New lab and weekly challenge fields are versioned without deleting previous notes or completion records. The complete topic spans several sessions in the 300-minute weekly plan. Estimates describe intended practice, not measured learner effort.

Answer options are shuffled once per session and the matching keys/explanations are saved with them. Reload, import and later content changes preserve what the learner actually answered. A case has three related questions with deferred feedback. Unfinished deferred attempts are hidden from statistics and the error list; mistake review is scheduled only after the session ends. A case counts once, requiring every answer to be correct. Prior exposure, hints, old versions and quarantined families cannot inflate independent first-attempt evidence.

Quality gates check content structure, all 26 ECO task labels, key-position variation and the answer-length cue. These checks accompany a separate Sol review; they do not calibrate difficulty, grade open responses or establish PMP readiness. Original learning questions remain separate from the absent exam reserve. The full mock stays blocked until an independent reserve and exam engine are ready.

## Findings

The initial monolithic app interleaves generated content, storage, routing and rendering. Attempts overwrite history; autosave is absent; imports accept malformed state and grow recursive backups. Cached v1 assets can mask fixes because service worker searches all old caches. Readiness counts draft duplicate questions. The prior test script searches source strings and proves none of these behaviors.

## Decision

Keep the existing local web app and original localhost origin so learner storage remains reachable. Split content into six validated versioned JSON packs, pure logic/persistence into core.js, and user flows into app.js. Add actual behavioral tests using the installed Playwright Python package and its bundled Node runtime. This avoids installing an unrelated frontend toolchain for a small local offline application.

Use schema v2 with append-only attempt snapshots and independent per-lesson drafts, persisted immediately. Migrate v1 without deleting it; archive unreliable v1 scores. Validate imported state deeply and preserve a separate non-recursive backup before replacements. No API calls are needed for lessons or feedback. Offline updates use version-specific caches and explicit update activation, leaving learner storage untouched.

Source facts and content status are data. Reworked content is reviewed by Sol per package; independent expert verification is not claimed. 35 minutes means approximately 12–15 minutes reading plus retrieval, case work, artifact writing and checks. No forced waiting timer.

## Scope of this revision

## Product iteration 2.1 — 2026-09-22

The audit found a gap between a static lesson catalog and daily learning: the 300-minute week was only descriptive, modes did not change recommendations, and aggregate scores could conceal small samples. `learning.js` now owns pure weekly planning, bounded review priorities, topic selection and descriptive statistics; it has separate behavior tests and is included in the offline/hosting allowlists.

Weekly work uses existing per-lesson fields, keeping schema v2 and old exports compatible. Foundation has a stable six-block sequence; other modes pin one topic to a local calendar week. Completion records activity and self-check, not automatic semantic grading. Guided work and prior question exposure are visible separately. Current PMI source facts were not changed in this iteration.

The independent Sol review led to three concrete corrections: a narrow first contact instead of requiring full lesson completion, one topic per week in maintenance/intensive, and a five-card daily recommendation budget with optional extra work. Terra's import validator was integrated with a regression correction for the real `lesson` session kind. Browser workflows, including old save migration, were rerun after integration.

Cloud sync, a provider adapter and a full exam engine remain outside this iteration; they would not resolve the immediate learning-loop gaps. No framework migration or added hosting service was needed.

Architecture, all 24 substantive lessons and 120 topical questions, autosaved exercises, review, backup/restore, navigation, private localhost server and reliable PWA update path. Hosted sync, provider API integration and a 540-item independent exam reserve remain separate from this local release.
