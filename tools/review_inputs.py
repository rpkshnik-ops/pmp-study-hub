"""Build a blind question sheet without answers; generated artifacts are local."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
for start,end in [(1,3),(4,6)]:
    paths=[ROOT/'content'/f'pack-{n:02}.json' for n in range(start,end+1)]
    if not all(p.exists() for p in paths):
        continue
    packs=[json.loads(p.read_text(encoding='utf-8-sig')) for p in paths]
    if any(len(p['lessons']) != 4 for p in packs):
        continue
    sheet=[]
    for pack in packs:
        for lesson in pack['lessons']:
            for q in lesson['questions']:
                sheet.append({k:q[k] for k in ['id','type','prompt','options','left','right','unit'] if k in q})
    (ROOT/'reviews').mkdir(exist_ok=True)
    (ROOT/'reviews'/f'blind-{start:02}-{end:02}.json').write_text(json.dumps(sheet,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'blind-{start:02}-{end:02}: {len(sheet)} questions')
