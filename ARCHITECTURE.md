# Architecture decision — 2026-09-18

## Findings

The initial monolithic app interleaves generated content, storage, routing and rendering. Attempts overwrite history; autosave is absent; imports accept malformed state and grow recursive backups. Cached v1 assets can mask fixes because service worker searches all old caches. Readiness counts draft duplicate questions. The prior test script searches source strings and proves none of these behaviors.

## Decision

Keep the existing local web app and original localhost origin so learner storage remains reachable. Split content into six validated versioned JSON packs, pure logic/persistence into core.js, and user flows into app.js. Add actual behavioral tests using the installed Playwright Python package and its bundled Node runtime. This avoids installing an unrelated frontend toolchain for a small local offline application.

Use schema v2 with append-only attempt snapshots and independent per-lesson drafts, persisted immediately. Migrate v1 without deleting it; archive unreliable v1 scores. Validate imported state deeply and preserve a separate non-recursive backup before replacements. No API calls are needed for lessons or feedback. Offline updates use version-specific caches and explicit update activation, leaving learner storage untouched.

Source facts and content status are data. Reworked content is reviewed by Sol per package; independent expert verification is not claimed. 35 minutes means approximately 12–15 minutes reading plus retrieval, case work, artifact writing and checks. No forced waiting timer.

## Scope of this revision

Architecture, all 24 substantive lessons and 120 topical questions, autosaved exercises, review, backup/restore, navigation, private localhost server and reliable PWA update path. Hosted sync, provider API integration and a 540-item independent exam reserve remain separate from this local release.
