"""Version the offline cache from the exact shipped assets. Run --write after changes."""
from pathlib import Path
import hashlib
import re
import argparse

ROOT=Path(__file__).resolve().parent.parent
ASSETS=['index.html','styles.css','config.js','core.js','learning.js','study.js','app.js','icon.svg','manifest.webmanifest']+[f'content/pack-{i:02}.json' for i in range(1,7)]

def release_id():
    digest=hashlib.sha256()
    for name in ASSETS:
        digest.update(name.encode());digest.update(b'\0');digest.update((ROOT/name).read_bytes().replace(b'\r\n',b'\n'));digest.update(b'\0')
    return 'pmp-study-hub-'+digest.hexdigest()[:16]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');args=parser.parse_args()
    path=ROOT/'sw.js';text=path.read_text(encoding='utf-8-sig');expected=release_id()
    match=re.search(r"const CACHE = '([^']+)';",text)
    if not match:raise SystemExit('Missing cache declaration')
    if args.write:
        path.write_text(text[:match.start(1)]+expected+text[match.end(1):],encoding='utf-8',newline='\n')
    elif match.group(1)!=expected:
        raise SystemExit('Offline assets changed. Run python tools/release.py --write before verification/release.')
    print('Offline release:',expected)

if __name__=='__main__':main()
