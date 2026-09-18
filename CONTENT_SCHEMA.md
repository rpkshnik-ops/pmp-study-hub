# Lesson schema v2 (authoring contract)

Each content/pack-NN.json is {schemaVersion:2,id:"pack-NN",version:2,lessons:[four lessons]}.
Lessons retain L01…L24 IDs; questions retain Q01-1…Q24-5 IDs with version 2 (v1 results are archived).

Lesson fields:
- id, version:2, week, title, approach (predictive/agile/hybrid), objectives:string[3], prerequisites:string[], introduction:string.
- eco:{domain:"People"|"Process"|"Business Environment",taskId:number,taskLabel:string}; real 2026 task, not generic invented labels.
- sourceRefs:[{id:string,section:string}] (source registry supplied separately). status:"draft" initially.
- terms:[{ru,en,definition}] (2–4 real definitions).
- sections:[{title,paragraphs:string[],bullets?:string[]}] (3–4 distinct substantive explanations).
- workedExample:{title,context,steps:string[],conclusion} (SAP example, explained decision process).
- recall:{prompts:string[3],guidance:string[3]} (guidance hidden until learner chooses reveal).
- transferCase:{title,context,prompts:string[3],hint,analysis:string[],alternate:string} (different industry, context contains NO answer; analysis initially hidden; explicit reason to transfer principle).
- artifact:{title,instructions,fields:[{id,label,placeholder}],example:string,rubric:string[]} (3–5 useful fields, worked exemplar hidden).
- pitfalls:[{mistake,correction}], summary:string[], stretch:{prompt,analysis}.
- questions: five ORIGINAL per-topic items, varied key positions, no repetitive generic questions, no unrelated EVM.
- cards: 2 on odd weeks, 3 on even weeks = 60 across 24 weeks; [{id:"C01-1",front,back}].

Question fields: id,version:2,type:"single"|"multi"|"numeric"|"matching",prompt, options:string[],correct:number[] (single/multi). For numeric use answer:number,tolerance:number,unit:string; no options/correct needed. For matching use left:string[],right:string[],correct:number[] with indices of right choices by left index. All have explanations:string[] (per option for single/multi, per match for matching, one computation for numeric), principle:string, hint:string, difficulty:"foundation"|"application"|"analysis", scenarioFamilyId:string (honestly distinct), context:"sap"|"other", approach, eco same shape, sourceRefs same shape, status:"draft", reserve:false.

Content is Russian and original. Aim 650–1000 meaningful Russian words per lesson excluding questions, with 15–20 minutes of active writing/application, not 35 minutes of reading. Avoid padding. Explain new terms; contrast roles and situations; teach concrete method with worked data. Source-check claims; do not present ECO as a textbook authority for formulas. Every lesson must stand alone for beginner PM with senior SAP technical background.

Do not mark model_reviewed simply because you authored it. Review logs are separate artifacts with actual findings and scope. No independent expert review is available.
