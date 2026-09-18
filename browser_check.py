"""Real browser checks against an isolated loopback server and fresh browser profiles."""
from pathlib import Path
from contextlib import contextmanager
import json
import threading
import time
import os
from tempfile import TemporaryDirectory
from urllib.parse import urlparse
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from serve import Handler

ROOT=Path(__file__).resolve().parent
KEY='pmp-study-hub-state-v2'
WINDOWS_CHROME=Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe')
CHROME=os.environ.get('CHROME') or (str(WINDOWS_CHROME) if WINDOWS_CHROME.exists() else None)
CONTENT=[l for i in range(1,7) for l in json.loads((ROOT/'content'/f'pack-{i:02}.json').read_text(encoding='utf-8-sig'))['lessons']]
BANK={q['id']:q for l in CONTENT for q in l['questions']}

class QuietHandler(Handler):
    def log_message(self,*args):
        pass

@contextmanager
def server(port=0):
    http=ThreadingHTTPServer(('127.0.0.1',port),QuietHandler)
    thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
    try:yield http
    finally:http.shutdown();http.server_close();thread.join()

def get_state(page):
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)

def fill_work(page,prefix):
    for i,field in enumerate(page.locator('textarea[data-work]').all()):
        field.fill(f'{prefix}: осмысленный ответ {i+1}, владелец и наблюдаемый результат.')

def answer(page,q,correct=True):
    form=page.locator('#answerForm')
    if q['type'] in ('single','multi'):
        indices=q['correct'] if correct else [next(i for i in range(len(q['options'])) if i not in q['correct'])]
        for i in indices:form.locator(f'input[value="{i}"]').check()
    elif q['type']=='numeric':
        form.locator('[name=numeric]').fill(str(q['answer']).replace('.',','))
    else:
        for i,index in enumerate(q['correct']):form.locator(f'[name=match-{i}]').select_option(str(index))
    form.locator('[name=confidence]').select_option('3')
    form.locator('button[type=submit]').click()
    page.locator('.feedback').first.wait_for()

def run():
    with server() as http, sync_playwright() as p:
        port=http.server_address[1];url=f'http://127.0.0.1:{port}'
        browser=p.chromium.launch(executable_path=CHROME,headless=True)
        context=browser.new_context(viewport={'width':1280,'height':900},accept_downloads=True)
        page=context.new_page();errors=[];external=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:external.append(r.url) if not r.url.startswith(url) else None)
        page.goto(url,wait_until='networkidle')
        page.locator('#profileForm button').click()
        page.get_by_role('link',name='Начать занятие',exact=True).click()
        page.get_by_role('heading',name=CONTENT[0]['title'],exact=True).wait_for()
        assert len(page.locator('.lesson-nav a').all())==6
        page.goto(url+'/#lesson?id=L01&step=recall');fill_work(page,'Воспроизведение')
        draft=page.locator('textarea').first.input_value()
        page.reload(wait_until='networkidle')
        assert page.locator('textarea').first.input_value()==draft
        page.goto(url+'/#lesson?id=L01&step=case');fill_work(page,'Новая ситуация')
        assert not page.locator('[data-reveal=case-analysis]').get_attribute('open')
        assert page.locator('[data-reveal=case-analysis] p').first.is_hidden()
        page.locator('[data-reveal=case-analysis] summary').click()
        page.wait_for_function('(key)=>JSON.parse(localStorage.getItem(key)).lessonWork.L01.revealed.includes("case-analysis")',arg=KEY)
        page.goto(url+'/#lesson?id=L01&step=artifact');fill_work(page,'Рабочий документ')
        with page.expect_download() as artifact_download:
            page.get_by_role('button',name='Скачать мой документ').click()
        assert 'Рабочий документ' in Path(artifact_download.value.path()).read_text(encoding='utf-8')
        page.goto(url+'/#lesson?id=L01&step=check')
        page.get_by_role('button',name='Решить вопросы урока').click()
        for i,q in enumerate(CONTENT[0]['questions']):
            answer(page,q,correct=i!=0)
            if i==0:
                page.reload(wait_until='networkidle')
                assert page.locator('#answerForm').count()==0
                assert get_state(page)['attempts'][0]['correct'] is False
            page.locator('[data-action=next-question]').click()
        assert len(get_state(page)['attempts'])==5
        page.get_by_role('link',name='Вернуться к завершению урока').click()
        page.locator('select[data-field=confidence]').select_option('3')
        page.locator('[data-action=complete]').click()
        assert 'L01' in get_state(page)['completedLessons']
        assert len(get_state(page)['reviews'])>=2
        # Real numeric control, not a radio button disguised as a numeric question.
        numeric=next(q for q in BANK.values() if q['type']=='numeric')
        lesson=next(l for l in CONTENT if any(q['id']==numeric['id'] for q in l['questions']))
        page.goto(url+'/#practice');page.locator(f'[data-action=start-practice][data-id={lesson["id"]}]').click()
        for q in lesson['questions']:
            answer(page,q)
            page.locator('[data-action=next-question]').click()
            if q['id']==numeric['id']:break
        assert any(a['questionId']==numeric['id'] and a['correct'] for a in get_state(page)['attempts'])
        # Switching topics parks unfinished drafts; they remain resumable.
        previous_id=get_state(page)['sessions']['quiz']['id']
        page.locator('[name=numeric]').fill('77')
        page.goto(url+'/#practice');page.locator('[data-action=start-practice][data-id=L02]').click()
        assert previous_id in get_state(page)['sessions']['saved']
        page.goto(url+'/#practice');page.locator(f'[data-action=resume-saved][data-id="{previous_id}"]').click()
        assert page.locator('[name=numeric]').input_value()=='77'
        # Export/import roundtrip through actual controls.
        page.goto(url+'/#settings')
        with page.expect_download() as result:page.locator('[data-action=export]').click()
        exported=Path(result.value.path()).read_bytes()
        saved=json.loads(exported)
        assert saved['schemaVersion']==2
        before=len(get_state(page)['attempts'])
        for _ in range(2):
            page.locator('#importFile').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':exported})
            page.locator('[data-action=merge]').click()
        assert len(get_state(page)['attempts'])==before
        # Timed practice uses an absolute deadline and persisted drafts across reload.
        page.goto(url+'/#exams');page.locator('[data-action=timed]').click()
        deadline=get_state(page)['sessions']['quiz']['deadline']
        page.reload(wait_until='networkidle')
        assert get_state(page)['sessions']['quiz']['deadline']==deadline
        assert page.locator('#timer').is_visible()
        page.goto(url+'/#settings')
        page.locator('#importFile').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':exported})
        page.locator('[data-action=replace]').click()
        assert page.locator('[data-action=download-backup]').count()>0
        malformed=dict(saved);malformed['state']=dict(saved['state']);malformed['state']['attempts']=[{'questionId':'bad'}]
        page.locator('#importFile').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':json.dumps(malformed).encode()})
        page.locator('#importPreview .error').wait_for()
        assert len(get_state(page)['attempts'])==before
        # Review changes interval, persistence survives reload.
        other=context.new_page();other.goto(url+'/#settings',wait_until='networkidle')
        other.locator('#profileForm [name=name]').fill('Из другой вкладки')
        other.locator('#profileForm button').click()
        page.locator('#notice').filter(has_text='другой вкладке').wait_for()
        page.locator('#importFile').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':exported})
        page.locator('[data-action=replace]').click()
        assert get_state(page)['profile']['name']=='Из другой вкладки'
        other.close();page.reload(wait_until='networkidle')
        page.evaluate('(key)=>{const s=JSON.parse(localStorage.getItem(key));for(const r of Object.values(s.reviews))r.dueAt="2026-01-01";localStorage.setItem(key,JSON.stringify(s));}',KEY)
        page.reload();page.goto(url+'/#review');page.locator('[data-action=show-card]').click()
        page.locator('[data-action=rate-card][data-rating="3"]').click()
        assert any(r['intervalDays']==3 for r in get_state(page)['reviews'].values())
        # Cache actually serves app + content without network.
        page.evaluate('navigator.serviceWorker.ready')
        page.reload(wait_until='networkidle')
        page.wait_for_function('navigator.serviceWorker.controller !== null')
        context.set_offline(True)
        page.goto(url+'/#lesson?id=L01&step=recall')
        page.reload(wait_until='networkidle')
        assert page.locator('textarea').first.input_value()==draft
        page.locator('textarea').first.fill('Offline ответ сохраняется без API и без сервера.')
        context.set_offline(False)
        page.reload(wait_until='networkidle')
        assert 'Offline ответ' in page.locator('textarea').first.input_value()
        # Phone: navigation, keyboard controls and all important pages fit the viewport.
        page.set_viewport_size({'width':390,'height':844})
        for route in ['today','route','lessons','lesson?id=L08','lesson?id=L01&step=artifact','practice','review','exams','experience','settings']:
            page.goto(url+'/#'+route)
            page.wait_for_timeout(50)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),route
        assert page.locator('#menuBtn').is_visible()
        page.locator('#menuBtn').click()
        assert page.locator('#nav').is_visible()
        page.screenshot(path=str(ROOT/'tests'/'mobile.png'),full_page=True)
        page.set_viewport_size({'width':1280,'height':900})
        page.goto(url+'/#lesson?id=L01&step=case')
        page.screenshot(path=str(ROOT/'tests'/'desktop.png'),full_page=True)
        assert not errors,errors
        # The installed antivirus injects its own browser script before the page runs.
        # Keep this visible and exclude only that known host, never arbitrary requests.
        unexpected=[u for u in external if urlparse(u).hostname!='gc.kis.v2.scr.kaspersky-labs.com']
        assert not unexpected,[urlparse(u).hostname for u in unexpected]
        if external:print('Environment: observed Kaspersky-injected requests; application-origin external requests: 0.',flush=True)
        # Migration in a separate browser context; never touches a real learner's profile.
        legacy=browser.new_context()
        legacy.add_init_script("""if(!localStorage.getItem('pmp-study-hub-state-v1'))localStorage.setItem('pmp-study-hub-state-v1',JSON.stringify({profile:{name:'Прежний ученик',education:'unknown',hours:5,language:'ru',examDate:''},onboarding:true,settings:{mode:'foundation'},attempts:{'Q01-1':{correct:true}},completedLessons:['L01'],reviews:{},journal:[{at:1789732800000,note:'Старая запись'}],experience:[]}));""")
        migrated=legacy.new_page();migrated.goto(url,wait_until='networkidle')
        s=get_state(migrated);assert s['profile']['name']=='Прежний ученик' and s['journal'][0]['note']=='Старая запись'
        assert len(s['attempts'])==0 and 'Q01-1' in s['legacy']['attempts']
        assert s['onboarding']
        # Browser context restart with exported browser storage, not app export.
        browser_state=context.storage_state()
        restarted=browser.new_context(storage_state=browser_state)
        again=restarted.new_page();again.goto(url,wait_until='networkidle')
        assert get_state(again)['lessonWork']['L01']['fields']['recall-0'].startswith('Offline ответ')
        assert 'L01' in get_state(again)['completedLessons']
        assert (again.request.get(url+'/archive/v1/app.js')).status==404
        assert (again.request.get(url+'/.chrome-test/')).status==404
        # Corrupt save: preserve original and restore through the recovery UI.
        damaged=browser.new_context();broken=damaged.new_page();broken.goto(url,wait_until='networkidle')
        broken.evaluate('(key)=>localStorage.setItem(key,"{broken")',KEY)
        broken.reload(wait_until='networkidle')
        broken.locator('#recoveryFile').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':exported})
        broken.locator('#restoreRecovery').click()
        broken.wait_for_function('(key)=>JSON.parse(localStorage.getItem(key)).schemaVersion===2',arg=KEY)
        assert broken.evaluate('(key)=>Object.keys(localStorage).some(k=>k.startsWith(key+"-recovery-")&&localStorage[k]==="{broken")',KEY)
        damaged.close();restarted.close();legacy.close();context.close();browser.close()
    # A real browser process and local HTTP server restart, using a disposable disk profile.
    with TemporaryDirectory(prefix='pmp-browser-') as profile, sync_playwright() as p:
        with server() as first:
            saved_port=first.server_address[1];origin=f'http://127.0.0.1:{saved_port}'
            persistent=p.chromium.launch_persistent_context(profile,executable_path=CHROME,headless=True)
            tab=persistent.pages[0];tab.goto(origin,wait_until='networkidle')
            tab.locator('#profileForm button').click()
            tab.goto(origin+'/#lesson?id=L01&step=recall')
            tab.locator('textarea').first.fill('Сохранено перед закрытием браузера и перезапуском сервера.')
            persistent.close()
        with server(saved_port):
            persistent=p.chromium.launch_persistent_context(profile,executable_path=CHROME,headless=True)
            tab=persistent.pages[0];tab.goto(origin+'/#lesson?id=L01&step=recall',wait_until='networkidle')
            assert tab.locator('textarea').first.input_value().startswith('Сохранено перед закрытием')
            persistent.close()
    print('PASS browser: actual answers, autosave/reload, completion, numeric/matching controls, backup/restore, migration, offline, phone layout, real browser/server restart, zero AI requests',flush=True)
if __name__=='__main__':run()
