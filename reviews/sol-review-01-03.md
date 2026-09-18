# Independent model review — packs 01–03

Reviewer: Codex peer agent `/root/sol_lessons_13_24` (GPT-5.6 Sol, high). Date: 2026-09-18. Scope: L01–L12, 60 original questions and explanations, transfer cases, artifacts, ECO mappings and cited primary sources. This is a model review, not an independent subject-matter expert certification.

## Blind-answer procedure and result

The 60 answers and reasons were saved in `reviews/sol-blind-01-03.json` before reading the keyed packs for this review. They match 60/60 stored keys exactly. Limitation: I opened a truncated part of `content/pack-01.json` earlier for schema and style while authoring packs 04–06, before this blind-review assignment arrived. Thus pack 01 received an independent content review but cannot be described as strictly blind. Packs 02–03 were unseen before saving blind answers. The saved answers were not revised after comparison.

Item audit: 38 single, 11 multi, 7 matching, 4 numeric; all four single-answer indices appear at similar rates (10, 9, 10, 9); 33 SAP and 27 other-industry items; 60 unique scenario family IDs. The distractors generally encode plausible wrong decisions rather than unrelated trivia. No key mismatch or item ambiguity required quarantine in this review.

## Findings and corrections

1. **L01 context accessibility, corrected.** The learner explicitly asked what a municipal service is. The library transfer case was already concrete, but did not explain the term. I added one short opening sentence to its `context`: a municipal service is a service the city or district organizes for residents, with this case being the district library. This stays inside the new situation and does not reveal the case answers.
2. **L08 rounding, corrected.** The pump-station transfer analysis expressed the forecast as `800/0,857≈933,3`; dividing by the rounded 0.857 gives about 933.5. I replaced that intermediate expression with `800/(240/280)≈933,3`, which preserves the exact underlying CPI and the intended result.
3. **No material substantive defect found in the other ten lessons.** L02 separates sponsor, PM and Product Owner rights; L03–L04 use concrete users and acceptance evidence; L05–L08 explain estimates, network dependencies, resources, quality and earned value with conditions; L09–L12 make leadership, communication, conflict and distributed work decisions observable. Transfer contexts present constraints without supplying the decision, and their hidden analyses explain when a different fact would change it.

## Source and calculation checks

- The dated [PMI ECO revised 11 August 2026](https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/pmp/pmp-examination-content-outline.pdf?rev=b8e1618215b74dfc926f5b406567f072) supports the used People, Process and Business Environment task labels and themes. The ECO is used as an exam map, not a source for EVM formulas.
- The [Scrum Guide](https://scrumguides.org/scrum-guide.html) supports L02 and L04 distinctions around Product Owner, Product Backlog and Definition of Done. The [PMI Code of Ethics](https://www.pmi.org/-/media/pmi/documents/public/pdf/ethics/pmi-code-of-ethics.pdf) supports the four ethical values in L02 and the respectful conflict handling in L11. [PMI's stakeholder management article](https://www.pmi.org/learning/library/stakeholder-management-plan-6090) and [communication article](https://www.pmi.org/learning/library/proactive-communication-project-managers-8228) support L03 and L10's planning and feedback themes.
- The [GAO Cost Guide](https://www.gao.gov/products/gao-20-195g) supports WBS, assumptions, estimation and updates; the [GAO Schedule Guide](https://www.gao.gov/products/gao-16-89g) supports network schedule and critical path analysis. The [PMI earned value article](https://www.pmi.org/learning/library/make-earned-value-work-project-6001) explicitly gives PV, EV, AC, CV, SV, CPI, SPI and both EAC assumptions used in L08.
- Independent arithmetic: Q06-1 `3+max(4,2)+2=9` working days; Q06-2 `6−4=2` days of total float; Q08-1 `80/100=0.8`; Q08-2 `240−300=−60` thousand. L08 transfer: `240/280≈0.8571429`, `800/(240/280)=933.333...` thousand, and `280+(800−240)=840` thousand. The lesson correctly states that monetary schedule variance is not a number of days.

## Review coverage and limits

I read the explanatory sections, SAP worked examples, transfer contexts/analyses, artifacts and item explanations for all 12 lessons, then checked the keys and source roles. All 12 remain within the 650–1000 Cyrillic-word instructional target after correction (671–881 by the project counting convention), with three substantive sections each. The review cannot establish how real learners will perform or how the official PMP exam will score them. No additional unresolved source or key issue was found.

After this item-level review and the two corrections, I marked the 12 lessons and 60 questions `model_reviewed` with `reviewedBy`, `reviewModel` and `reviewDate` metadata. This marker denotes a peer model review only.
