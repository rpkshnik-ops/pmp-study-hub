'use strict';
globalThis.PMPConfig = {
  version: '2.0.0', contentVersion: '2026.2', checkedAt: '2026-09-18',
  packs: [1,2,3,4,5,6].map(n => `content/pack-${String(n).padStart(2,'0')}.json`),
  blueprint: {id:'ECO-2026-08-11',domains:{People:33,Process:41,'Business Environment':26},questions:180,minutes:240,reserveRequired:180},
  eligibility: {id:'eligibility-2026-08-11',windowMonths:120,months:{secondary:60,associate:48,bachelor:36,gac:24},trainingHours:35,providerChange:'2026-12-01'},
  sources: {
    'PMI-ECO-2026': {title:'PMI — PMP Examination Content Outline',version:'Revised 11 August 2026',url:'https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/pmp/pmp-examination-content-outline.pdf?rev=b8e1618215b74dfc926f5b406567f072'},
    'PMI-PROJECT': {title:'PMI — What is a project?',version:'Проверено 18.09.2026',url:'https://www.pmi.org/about/what-is-a-project'},
    'PMI-NEW-2026': {title:'PMI — изменения экзамена и обучения',version:'Проверено 18.09.2026',url:'https://www.pmi.org/certifications/project-management-pmp/new-exam'},
    'SCRUM-2020': {title:'Scrum Guide — Ken Schwaber, Jeff Sutherland',version:'November 2020',url:'https://scrumguides.org/scrum-guide.html'},
    'AGILE-MANIFESTO': {title:'Манифест Agile и принципы',version:'2001',url:'https://agilemanifesto.org/iso/ru/principles.html'},
    'KANBAN-GUIDE': {title:'The Kanban Guide',version:'May 2025',url:'https://kanbanguides.org/the-kanban-guide/2025.5/'},
    'GAO-SCHEDULE': {title:'GAO Schedule Assessment Guide',version:'GAO-16-89G',url:'https://www.gao.gov/products/gao-16-89g'},
    'GAO-COST': {title:'GAO Cost Estimating and Assessment Guide',version:'GAO-20-195G',url:'https://www.gao.gov/products/gao-20-195g'},
    'PMI-ETHICS': {title:'PMI — Code of Ethics and Professional Conduct',version:'Effective 17 November 2025',url:'https://www.pmi.org/-/media/pmi/documents/public/pdf/ethics/pmi-code-of-ethics.pdf'},
    'PMI-STAKEHOLDERS': {title:'PMI — Stakeholder Management Plan',version:'Практическая статья, проверено 18.09.2026',url:'https://www.pmi.org/learning/library/stakeholder-management-plan-6090'},
    'PMI-COMMS': {title:'PMI — Proactive Communication for Project Managers',version:'Практическая статья, проверено 18.09.2026',url:'https://www.pmi.org/learning/library/proactive-communication-project-managers-8228'},
    'PMI-EVM': {title:'PMI — How to Make Earned Value Work on Your Project',version:'Практическая статья, проверено 18.09.2026',url:'https://www.pmi.org/learning/library/make-earned-value-work-project-6001'},
    'NIST-AI': {title:'NIST — AI Risk Management Framework',version:'AI RMF 1.0',url:'https://www.nist.gov/itl/ai-risk-management-framework'},
    'IES-LEARNING': {title:'IES — Organizing Instruction and Study to Improve Student Learning',version:'Practice Guide, 2007',url:'https://ies.ed.gov/ncee/wwc/PracticeGuide/1'}
  }
};
