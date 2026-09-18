# PMP Study Hub — working rules

- Keep the product usable offline and without any AI request.
- Preserve learner data in browser local storage; communicate that device sync is manual through export/import.
- Treat PMI facts as versioned source data. Do not promise eligibility or an exam result.
- Content is original, in Russian, with English terms where useful. Do not use protected exam items.
- Use `PROJECT_STATE.md` for finished work, verification evidence, limitations, and the next concrete step.
- For material ambiguity, quarantine the item instead of using it in scored work.
- After changing shipped code or content, run `python tools/release.py --write` and `python verify.py --browser`; the offline cache ID must match the asset hash.
- Never commit browser profiles, learner exports, credentials or generated local storage files. Static hosting receives only the allowlisted assets in `tools/build_site.py`.
