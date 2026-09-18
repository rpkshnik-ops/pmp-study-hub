"""Validate content and run deterministic behavior tests. Add --browser for the complete path."""
from pathlib import Path
import argparse
import json
import re
import subprocess
import sys
import shutil
import collections
import playwright

ROOT=Path(__file__).resolve().parent
NODE=shutil.which('node') or str(Path(playwright.__file__).parent/'driver'/('node.exe' if sys.platform=='win32' else 'node'))
def text_count(l):
    sections=[l['introduction']]
    sections.extend(p for s in l['sections'] for p in s['paragraphs'])
    sections.extend(l['workedExample']['steps'])
    sections.extend([l['workedExample']['context'],l['workedExample']['conclusion'],l['transferCase']['context']])
    sections.extend(l['transferCase']['analysis'])
    sections.extend([l['artifact']['instructions'],l['artifact']['example']])
    return len(re.findall(r"\S+",' '.join(sections)))
def check_content():
    config=json.loads(subprocess.check_output([NODE,'-e','require("./config.js");process.stdout.write(JSON.stringify(globalThis.PMPConfig))'],cwd=ROOT,text=True))
    packs=[json.loads((ROOT/'content'/f'pack-{i:02}.json').read_text(encoding='utf-8-sig')) for i in range(1,7)]
    lessons=[l for p in packs for l in p['lessons']]
    assert all(p['schemaVersion']==2 and len(p['lessons'])==4 for p in packs)
    assert [l['id'] for l in lessons]==[f'L{i:02}' for i in range(1,25)]
    ids=set();families=set();prompts=set();key_positions=collections.Counter();types=collections.Counter();contexts=collections.Counter()
    for l in lessons:
        assert l['version']==2 and len(l['objectives'])>=3 and len(l['sections'])>=3,l['id']
        assert text_count(l)>=600,(l['id'],'insufficient meaningful instructional text',text_count(l))
        assert len(l['recall']['prompts'])==3 and len(l['recall']['guidance'])==3
        assert len(l['transferCase']['prompts'])==3 and len(l['transferCase']['analysis'])>=2
        assert len(l['artifact']['fields'])>=3 and len(l['artifact']['rubric'])>=3
        assert l['sourceRefs'] and all(r['section'] for r in l['sourceRefs'])
        assert all(r['id'] in config['sources'] for r in l['sourceRefs']),l['id']
        assert l['status']=='model_reviewed' and l.get('reviewedBy') and l.get('reviewDate'),l['id']
        assert len(l['questions'])==5 and len(l['cards'])==(2 if l['week']%2 else 3)
        assert l['eco']['domain'] in ('People','Process','Business Environment')
        assert l['eco']['taskId'] in range(1,11)
        for q in l['questions']:
            assert q['id'] not in ids and q['scenarioFamilyId'] not in families
            assert q['prompt'] not in prompts and q['version']==2
            assert q['sourceRefs'] and q['principle'] and q['hint']
            assert all(r['id'] in config['sources'] for r in q['sourceRefs']),q['id']
            assert q['status']=='model_reviewed' and q.get('reviewedBy') and q.get('reviewDate'),q['id']
            ids.add(q['id']);families.add(q['scenarioFamilyId']);prompts.add(q['prompt']);types[q['type']]+=1;contexts[q['context']]+=1
            if q['type'] in ('single','multi'):
                assert len(q['options'])>=3 and len(q['options'])==len(q['explanations'])
                assert len(set(q['correct']))==len(q['correct']) and all(0<=c<len(q['options']) for c in q['correct'])
                assert len(q['correct'])==(1 if q['type']=='single' else len(q['correct']))
                if q['type']=='multi':assert len(q['correct'])>=2
                if q['type']=='single':key_positions[q['correct'][0]]+=1
            elif q['type']=='numeric':
                assert isinstance(q['answer'],(int,float)) and q['tolerance']>=0 and q['explanations']
            elif q['type']=='matching':
                assert len(q['left'])==len(q['correct'])==len(q['explanations'])
                assert all(0<=c<len(q['right']) for c in q['correct'])
            else:raise AssertionError('unknown type '+q['type'])
    assert len(ids)==120 and len(families)==120
    assert all(types[k]>0 for k in ['single','multi','numeric','matching'])
    assert len(key_positions)>=3 and max(key_positions.values())<sum(key_positions.values())*.7
    assert 40<=contexts['sap']<=80,contexts
    print(f'Content: {len(lessons)} substantive lessons, {len(ids)} unique questions, 60 cards; text range {min(map(text_count,lessons))}–{max(map(text_count,lessons))} words.')
    print('Question types:',dict(types),'Contexts:',dict(contexts),'Single-choice key positions:',dict(key_positions))
    return lessons
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--browser',action='store_true');args=parser.parse_args()
    subprocess.run([sys.executable,str(ROOT/'tools'/'release.py')],check=True)
    for file in ['app.js','core.js','config.js','sw.js']:
        subprocess.run([NODE,'--check',str(ROOT/file)],check=True)
    subprocess.run([NODE,'--test',str(ROOT/'tests'/'core.test.cjs')],check=True)
    check_content()
    if args.browser:subprocess.run([sys.executable,str(ROOT/'browser_check.py')],cwd=ROOT,check=True)
    print('PASS: syntax, deterministic behavior and content integrity'+(', browser workflows' if args.browser else ''))
if __name__=='__main__':main()
