"""Validate content and run deterministic behavior tests. Add --browser for full workflows."""
from pathlib import Path
import argparse
import collections
import hashlib
import json
import re
import shutil
import subprocess
import sys
import playwright
from tools.content_quality import check_curriculum

ROOT=Path(__file__).resolve().parent
NODE=shutil.which('node') or str(Path(playwright.__file__).parent/'driver'/('node.exe' if sys.platform=='win32' else 'node'))


def text_count(l):
    parts=[l['introduction']]
    parts.extend(p for s in l['sections'] for p in s['paragraphs'])
    parts.extend(l['workedExample']['steps'])
    parts.extend([l['workedExample']['context'],l['workedExample']['conclusion'],l['transferCase']['context']])
    parts.extend(l['transferCase']['analysis'])
    parts.extend([l['artifact']['instructions'],l['artifact']['example']])
    return len(re.findall(r'\S+',' '.join(parts)))


def check_content():
    config=json.loads(subprocess.check_output([NODE,'-e','require("./config.js");process.stdout.write(JSON.stringify(globalThis.PMPConfig))'],cwd=ROOT,text=True,encoding='utf-8'))
    packs=[json.loads((ROOT/'content'/f'pack-{i:02}.json').read_text(encoding='utf-8-sig')) for i in range(1,7)]
    assert all(p['schemaVersion']==2 and p['version']==3 and len(p['lessons'])==4 for p in packs)
    lessons=[lesson for pack in packs for lesson in pack['lessons']]
    assert [l['id'] for l in lessons]==[f'L{i:02}' for i in range(1,25)]
    assert len(config['pmbokDomains'])==7 and all(d['lessons'] and all(any(l['id']==id for l in lessons) for id in d['lessons']) for d in config['pmbokDomains'])
    for l in lessons:
        assert len(l['objectives'])>=3 and len(l['sections'])>=4,l['id']
        assert text_count(l)>=600,l['id']
        assert len(l['recall']['prompts'])==len(l['recall']['guidance'])==3,l['id']
        assert len(l['transferCase']['prompts'])==3 and len(l['transferCase']['analysis'])>=2,l['id']
        assert len(l['artifact']['fields'])>=3 and len(l['artifact']['rubric'])>=3,l['id']
        assert len(l['cards'])==(2 if l['week']%2 else 3),l['id']
    cards=[c for l in lessons for c in l['cards']]
    assert len(cards)==len({c['id'] for c in cards})==60
    check_curriculum(lessons,config['sources'])
    manifest=json.loads((ROOT/'reviews'/'review-manifest-2026.3.json').read_text(encoding='utf-8'))
    assert manifest['contentVersion']==config['contentVersion'] and set(manifest['packs'])==set(config['packs'])
    for name,entry in manifest['packs'].items():
        digest=hashlib.sha256((ROOT/name).read_bytes().replace(b'\r\n',b'\n')).hexdigest()
        assert digest==entry['sha256LF'], (name,'content changed since recorded peer review')
        assert (ROOT/entry['report']).is_file() and (ROOT/entry['blindAnswers']).is_file(), name
    for suffix,first_week in [('01-03',1),('04-06',13)]:
        blind=json.loads((ROOT/'reviews'/f'sol-blind-v3-{suffix}.json').read_text(encoding='utf-8'))
        responses=blind.get('responses',blind.get('answers',[]))
        expected={f'Q{week:02}-{n}' for week in range(first_week,first_week+12) for n in range(1,9)}
        assert len(responses)==96 and {r['id'] for r in responses}==expected, suffix
    questions=[q for l in lessons for q in l['questions']]
    types=collections.Counter(q['type'] for q in questions)
    contexts=collections.Counter(q['context'] for q in questions)
    assert all(types[k]>0 for k in ['single','multi','numeric','matching'])
    assert .35<=contexts['sap']/len(questions)<=.65,contexts
    print(f'Content: {len(lessons)} lessons, {len(questions)} questions, 60 cards; core text {min(map(text_count,lessons))}–{max(map(text_count,lessons))} words, excluding new labs.')
    print('Question types:',dict(types),'Contexts:',dict(contexts))
    return lessons


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--browser',action='store_true');args=parser.parse_args()
    subprocess.run([sys.executable,str(ROOT/'tools'/'release.py')],check=True)
    for file in ['app.js','core.js','learning.js','study.js','config.js','sw.js']:
        subprocess.run([NODE,'--check',str(ROOT/file)],check=True)
    subprocess.run([NODE,'--test',*[str(p) for p in sorted((ROOT/'tests').glob('*.test.cjs'))]],check=True)
    check_content()
    if args.browser:subprocess.run([sys.executable,str(ROOT/'browser_check.py')],cwd=ROOT,check=True)
    print('PASS: syntax, deterministic behavior and content integrity'+(', browser workflows' if args.browser else ''))


if __name__=='__main__':main()
