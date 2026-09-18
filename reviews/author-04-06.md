# Author log — packs 04–06

Date: 2026-09-18. Scope: L13–L24, Q13-1–Q24-5, C13-1–C24-3. Author check only; independent model review is pending. All lesson and question statuses remain `draft`.

## Sources checked before authoring

The source IDs below already exist in `config.js`; no new registry ID was added. Sections identify the precise material used, not a claim that the source prescribes every teaching example.

| ID | Exact URL | Sections used |
|---|---|---|
| `PMI-ECO-2026` | https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/pmp/pmp-examination-content-outline.pdf?rev=b8e1618215b74dfc926f5b406567f072 | Revised 11 August 2026; People tasks 7–8, pp. 7–8; Process tasks 1–10, pp. 9–10; Business Environment tasks 1–8, pp. 11–12; Exam Information, p. 17. Task labels and 180 questions, 170 scored, 10 pretest, 240 minutes, and domain weights checked against this revision. |
| `SCRUM-2020` | https://scrumguides.org/scrum-guide.html | Scrum Theory; Scrum Team and accountabilities; Sprint and events; artifacts and their commitments; Product Owner; Definition of Done. November 2020 guide. |
| `AGILE-MANIFESTO` | https://agilemanifesto.org/iso/ru/principles.html | Principles on early value, change, collaboration, quality, and reflection. |
| `KANBAN-GUIDE` | https://kanbanguides.org/english/ | Redirects to https://kanbanguides.org/the-kanban-guide/2025.5/; May 2025 Definition of Workflow, practices and four flow metrics. WIP, throughput, age and cycle time use the guide's start/finish definitions. Forecast examples are explicitly illustrative. |
| `NIST-AI` | https://www.nist.gov/itl/ai-risk-management-framework | AI RMF 1.0 overview; direct primary PDF https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf, Part 2 Core: Govern, Map, Measure, Manage. The framework is voluntary and is being revised; the lesson does not treat it as a law or certificate. |
| `PMI-NEW-2026` | https://www.pmi.org/certifications/project-management-pmp/new-exam | PMP Exam Updates: July 2026 update and topic emphasis. Exam structure is taken from the dated ECO above. |
| `PMI-PROJECT` | https://www.pmi.org/about/what-is-a-project | Project and value context for the business case lesson. |
| `IES-LEARNING` | https://ies.ed.gov/ncee/wwc/PracticeGuide/1 | Recommendations 1, 5b, 6b and 7: spaced study, quizzes to revisit content, error diagnosis and deep explanation. Applied as study guidance, without claiming a pass prediction. |

## Author check

Parsed all three JSON files and checked exact week order 13–24, `schemaVersion: 2`, 12 unique lesson IDs, 60 unique question IDs, 60 unique scenario family IDs, five questions each, 30 cards with odd/even distribution 2/3, valid question indices and explanation counts, and `draft` statuses. Question types: 35 single, 12 multi, 11 matching, 2 numeric. Single answer positions are distributed across all four indices; there are no recycled generic question stems.

Russian word counts for the instructional fields excluding questions, using Cyrillic token matching: L13 826, L14 918, L15 938, L16 904, L17 918, L18 901, L19 885, L20 904, L21 862, L22 907, L23 970, L24 924. The count includes worked examples, transfer analysis and artifact guidance; each lesson also has three substantial explanatory sections. Transfer `context` fields were checked to state a situation and constraints without giving the decision.

Numeric answers checked independently: Q15-1: 8 June minus 1 June = 7 calendar days. Q24-3: 240 × 60 ÷ 180 = 80 seconds per item on average. Neither number is a delivery or exam score promise.

Review attention: check that every scenario's proposed decision follows its stated contractual or organizational authority, especially L18, L21 and L23; that UAT acceptance language remains separate from general quality and go-live; and that the AI RMF framing stays voluntary. All SAP and other-industry cases are invented teaching examples, not PMI exam items or claims about a specific production system.
