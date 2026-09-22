"""Stage only public application assets for static hosting."""
from pathlib import Path
import shutil
import subprocess
import sys

ROOT=Path(__file__).resolve().parent.parent
subprocess.run([sys.executable,str(ROOT/'tools'/'release.py')],check=True)
destination=ROOT/'_site'
destination.mkdir(exist_ok=True)
assets=['index.html','styles.css','config.js','core.js','learning.js','study.js','app.js','sw.js','icon.svg','manifest.webmanifest']+[f'content/pack-{i:02}.json' for i in range(1,7)]
for name in assets:
    target=destination/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,target)
(destination/'.nojekyll').write_text('',encoding='utf-8')
print(f'Staged {len(assets)} application assets in _site. No learner files included.')
