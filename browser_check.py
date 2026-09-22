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

def session_question(page, source):
    """Use the persisted shuffled snapshot, never the source-bank answer order."""
    question_id=source if isinstance(source,str) else source['id']
    session=get_state(page)['sessions']['quiz']
    assert session['questionIds'][session['index']]==question_id
    question=session['questionSnapshots'][question_id]
    assert question['id']==question_id
    page.get_by_role('heading',name=question['prompt'],exact=True).wait_for()
    return question

def answer(page,source,correct=True):
    q=session_question(page,source)
    form=page.locator('#answerForm')
    if q['type'] in ('single','multi'):
        indices=q['correct'] if correct else [next(i for i in range(len(q['options'])) if i not in q['correct'])]
        for i in indices:form.locator(f'input[value="{i}"]').check()
    elif q['type']=='numeric':
        value=q['answer'] if correct else q['answer']+q['tolerance']+1
        form.locator('[name=numeric]').fill(str(value).replace('.',','))
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
        assert len(CONTENT)==24 and all(len(lesson['questions'])==8 for lesson in CONTENT)
        assert sum(bool(lesson.get('caseStudy')) for lesson in CONTENT)==6
        assert all(len([q for q in lesson['questions'] if not q.get('caseId')])==5 if lesson.get('caseStudy') else len([q for q in lesson['questions'] if not q.get('caseId')])==8 for lesson in CONTENT)
        assert 'step=read' in page.get_by_role('link',name='Есть 10–15 минут',exact=True).get_attribute('href')
        page.get_by_role('link',name='Начать занятие',exact=True).click()
        page.get_by_role('heading',name=CONTENT[0]['title'],exact=True).wait_for()
        assert len(page.locator('.lesson-nav a').all())==7
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
        # These presentation and persistence checks do not require scored items.
        page.goto(url+'/#lessons');page.locator('#coverageMap summary').click()
        assert page.locator('#coverageMap > ul.steps > li').count()==7
        assert page.locator('#coverageMap > ol.steps > li').count()==26
        l01=CONTENT[0];lab=l01['lab'];lab_key=f'lab-v{l01["version"]}-'
        page.goto(url+'/#lesson?id=L01&step=lab')
        assert page.locator('.data-table').count()==1 and not page.locator('details[data-reveal]').first.get_attribute('open')
        page.locator('[data-action=complete-lab]').click()
        assert not get_state(page)['lessonWork']['L01']['fields'].get(lab_key+'done')
        lab_draft='Расчёт опирается на таблицу, показывает условие пересмотра и владельца следующего решения.'
        for field in page.locator('textarea[data-work]').all():field.fill(lab_draft)
        page.reload(wait_until='networkidle')
        assert page.locator('textarea[data-work]').first.input_value()==lab_draft
        for rubric in page.locator('select[data-work]').all():rubric.select_option('yes')
        page.locator('[data-action=complete-lab]').click()
        assert get_state(page)['lessonWork']['L01']['fields'][lab_key+'done']
        with page.expect_download() as lab_download:page.locator('[data-action=export-lab]').click()
        exported_lab=Path(lab_download.value.path()).read_text(encoding='utf-8')
        assert lab['table']['caption'] in exported_lab and '|' in exported_lab
        page.set_viewport_size({'width':375,'height':844})
        for lesson_id in ['L15','L21']:
            page.goto(url+'/#lesson?id='+lesson_id+'&step=lab')
            assert page.locator('.data-table').count()==1 and page.locator('.data-chart svg').count()==1
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),lesson_id
        page.screenshot(path=str(ROOT/'tests'/'lab-mobile.png'),full_page=True)
        page.set_viewport_size({'width':1280,'height':900})
        page.goto(url+'/#lesson?id=L01&step=check')
        assert all(q['status'] in ('model_reviewed','expert_reviewed') for q in BANK.values()), 'Full browser verification requires reviewed content; a draft run cannot pass.'
        page.get_by_role('button',name='Решить вопросы урока').click()
        normal_l01=[q for q in CONTENT[0]['questions'] if not q.get('caseId')]
        for i,q in enumerate(normal_l01):
            answer(page,q,correct=i!=0)
            if i==0:
                page.reload(wait_until='networkidle')
                assert page.locator('#answerForm').count()==0
                assert get_state(page)['attempts'][0]['correct'] is False
            page.locator('[data-action=next-question]').click()
        assert len(get_state(page)['attempts'])==len(normal_l01)
        page.get_by_role('link',name='Вернуться к завершению урока').click()
        page.locator('select[data-field=confidence]').select_option('3')
        page.locator('[data-action=complete]').click()
        assert 'L01' in get_state(page)['completedLessons']
        assert len(get_state(page)['reviews'])>=2
        # A completed lesson does not skip the rest of its weekly practice.
        page.goto(url+'/#week?id=L01&task=recall')
        page.locator('[data-action=complete-week]').click()
        assert 'Запишите результат' in page.locator('#weekFeedback').inner_text()
        page.locator('textarea').fill('Объяснил принцип своими словами, привёл контрпример и исправил допущение после сверки.')
        page.locator('select[data-work]').select_option('yes')
        page.locator('[data-action=complete-week]').click()
        page.reload(wait_until='networkidle')
        assert 'Объяснил принцип' in page.locator('textarea').input_value()
        assert any(k.endswith('recall-done') for k in get_state(page)['lessonWork']['L01']['fields'])
        with page.expect_download() as week_download:page.locator('[data-action=export-week]').click()
        assert 'Объяснил принцип' in Path(week_download.value.path()).read_text(encoding='utf-8')
        page.goto(url+'/#progress')
        assert page.get_by_role('heading',name='Что получается и что повторить').is_visible()
        assert page.locator('tbody tr').count()==24
        page.goto(url+'/#lessons');page.locator('#coverageMap summary').click()
        assert page.locator('#coverageMap > ul.steps > li').count()==7
        assert page.locator('#coverageMap > ol.steps > li').count()==26
        # L03 case keeps one shared stimulus and delays any correctness disclosure.
        l03=next(l for l in CONTENT if l['id']=='L03')
        case_questions=[q for q in l03['questions'] if q.get('caseId')]
        page.goto(url+'/#practice');page.locator('[data-action=start-case][data-id=L03]').click()
        page.locator('.case-context .data-table').wait_for()
        case_state=get_state(page)['sessions']['quiz']
        assert case_state['kind']=='case' and case_state['questionIds']==[q['id'] for q in case_questions]
        assert page.locator('.case-context .data-table').count()==1
        previous_reviews=get_state(page)['reviews']
        answer(page,case_questions[0],correct=False)
        assert get_state(page)['attempts'][-1]['correct'] is False
        assert get_state(page)['reviews']==previous_reviews
        assert page.locator('.feedback').first.is_visible()
        correct_option=case_questions[0]['options'][case_questions[0]['correct'][0]]
        assert correct_option not in page.locator('#main').inner_text()
        snapshots=json.dumps(get_state(page)['sessions']['quiz']['questionSnapshots'],sort_keys=True,ensure_ascii=False)
        page.screenshot(path=str(ROOT/'tests'/'case-desktop.png'),full_page=True)
        page.reload(wait_until='networkidle')
        assert json.dumps(get_state(page)['sessions']['quiz']['questionSnapshots'],sort_keys=True,ensure_ascii=False)==snapshots
        for route in ['progress','review']:
            page.goto(url+'/#'+route);assert correct_option not in page.locator('#main').inner_text()
        page.goto(url+'/#practice?session=active')
        for q in case_questions[1:]:
            page.locator('[data-action=next-question]').click();answer(page,q)
        page.locator('[data-action=next-question]').click()
        assert get_state(page)['sessions']['quiz']['finished']
        assert all(c['id'] in get_state(page)['reviews'] for c in l03['cards'])
        # Select an actual current numeric item and retain its unfinished draft.
        numeric=next(q for q in BANK.values() if q['type']=='numeric' and not q.get('caseId'))
        lesson=next(l for l in CONTENT if any(q['id']==numeric['id'] for q in l['questions']))
        page.goto(url+'/#practice');page.locator(f'[data-action=start-practice][data-id={lesson["id"]}]').click()
        for q in [q for q in lesson['questions'] if not q.get('caseId')]:
            assert session_question(page,q)['id']==q['id']
            if q['id']==numeric['id']:break
            answer(page,q)
            page.locator('[data-action=next-question]').click()
        # Switching topics parks unfinished drafts; they remain resumable.
        previous_id=get_state(page)['sessions']['quiz']['id']
        draft_numeric=str(session_question(page,numeric)['answer']).replace('.',',')
        page.locator('[name=numeric]').fill(draft_numeric)
        page.goto(url+'/#practice');page.locator('[data-action=start-practice][data-id=L02]').click()
        assert previous_id in get_state(page)['sessions']['saved']
        page.goto(url+'/#practice');page.locator(f'[data-action=resume-saved][data-id="{previous_id}"]').click()
        assert page.locator('[name=numeric]').input_value()==draft_numeric
        answer(page,numeric)
        assert get_state(page)['attempts'][-1]['correct']
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
        assert page.evaluate("fetch('study.js').then(r=>r.ok)")
        page.goto(url+'/#lesson?id=L01&step=lab');page.reload(wait_until='networkidle')
        assert page.locator('.data-table').count()==1
        page.goto(url+'/#practice');page.locator('[data-action=start-case][data-id=L06]').click()
        offline_question=get_state(page)['sessions']['quiz']['questionIds'][0]
        assert page.locator('.case-context .data-table').count()==1
        answer(page,offline_question)
        page.reload(wait_until='networkidle')
        assert get_state(page)['attempts'][-1]['questionId']==offline_question
        assert 'Верный ответ:' not in page.locator('#main').inner_text()
        context.set_offline(False)
        page.goto(url+'/#lesson?id=L01&step=recall')
        page.reload(wait_until='networkidle')
        assert 'Offline ответ' in page.locator('textarea').first.input_value()
        # Phone: navigation, keyboard controls and all important pages fit the viewport.
        page.set_viewport_size({'width':375,'height':844})
        for lesson_id in ['L15','L21']:
            page.goto(url+'/#lesson?id='+lesson_id+'&step=lab')
            assert page.locator('.data-table').count()==1 and page.locator('.data-chart svg').count()==1
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),lesson_id
        page.set_viewport_size({'width':390,'height':844})
        for route in ['today','route','week?id=L01','progress','lessons','lesson?id=L08','lesson?id=L01&step=artifact','practice','review','exams','experience','settings']:
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
        # A real v2 snapshot remains answerable after the v3 content update.
        old_question=json.loads((ROOT/'tests/fixtures/q01-v2.json').read_text(encoding='utf-8'))
        previous=browser.new_context();vp=previous.new_page();vp.goto(url,wait_until='networkidle')
        vp.evaluate('''({key,q})=>{
          const s=PMPCore.createState(),at=new Date().toISOString();s.onboarding=true;s.completedLessons=['L01'];
          s.lessonWork.L01={fields:{'recall-0':'Старое объяснение ученика','plan-foundation-all-challenge-done':at,'plan-foundation-all-challengenote':'Старая самостоятельная работа'},revealed:[]};
          s.sessions.quiz={id:'v2-session',kind:'lesson',lessonId:'L01',questionIds:[q.id],questionSnapshots:{[q.id]:q},index:0,startedAt:at,deadline:'',draftAnswers:{[q.id]:q.correct},confidence:{[q.id]:3},assisted:{},started:{[q.id]:at},previouslySeen:{[q.id]:false},responseIds:[],finished:false};
          s.exposures=[{id:q.scenarioFamilyId,questionId:q.id,at}];localStorage.setItem(key,JSON.stringify(s));
        }''',{'key':KEY,'q':old_question})
        vp.reload(wait_until='networkidle');vp.goto(url+'/#practice?session=active')
        assert vp.get_by_role('heading',name=old_question['prompt'],exact=True).is_visible()
        assert session_question(vp,old_question)['options']==old_question['options']
        answer(vp,old_question)
        assert get_state(vp)['attempts'][-1]['questionVersion']==2 and get_state(vp)['attempts'][-1]['correct']
        vp.goto(url+'/#lesson?id=L01&step=lab')
        assert 'L01' in get_state(vp)['completedLessons']
        assert get_state(vp)['lessonWork']['L01']['fields']['recall-0']=='Старое объяснение ученика'
        assert not get_state(vp)['lessonWork']['L01']['fields'].get('lab-v3-done')
        vp.goto(url+'/#practice');vp.locator('[data-action=start-practice][data-id=L01]').click()
        answer(vp,CONTENT[0]['questions'][0]);latest=get_state(vp)['attempts'][-1]
        assert latest['questionVersion']==3 and latest['priorExposure']
        # Very old v2 drafts without snapshots are preserved, but cannot use a new key.
        vp.evaluate('''({key,q})=>{const s=JSON.parse(localStorage.getItem(key)),at=new Date().toISOString();
          s.sessions.quiz={id:'missing-snapshot',kind:'lesson',lessonId:'L01',questionIds:[q.id],index:0,startedAt:at,deadline:'',draftAnswers:{[q.id]:[0]},confidence:{},assisted:{},started:{[q.id]:at},responseIds:[],finished:false};
          localStorage.setItem(key,JSON.stringify(s));}''',{'key':KEY,'q':old_question})
        vp.reload(wait_until='networkidle');vp.goto(url+'/#practice?session=active')
        assert vp.get_by_role('heading',name='Для этого вопроса не сохранился снимок',exact=True).is_visible()
        assert get_state(vp)['sessions']['quiz']['draftAnswers'][old_question['id']]==[0]
        assert vp.locator('#answerForm').count()==0
        previous.close()
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
        # New weekly workflow: a narrow first block does not require the whole lesson.
        features=browser.new_context();fp=features.new_page();fp.on('pageerror',lambda e:errors.append(str(e)))
        fp.goto(url,wait_until='networkidle');fp.locator('#profileForm button').click()
        fp.goto(url+'/#lesson?id=L01&step=recall');fill_work(fp,'Своя формулировка')
        fp.goto(url+'/#week?id=L01&task=lesson');fp.locator('textarea').fill('Выделил понятия и исправил неточную формулировку после сверки с примером.')
        fp.locator('select[data-work]').select_option('yes');fp.locator('[data-action=complete-week]').click()
        assert get_state(fp)['completedLessons']==[]
        assert any(k.endswith('lesson-done') for k in get_state(fp)['lessonWork']['L01']['fields'])
        fp.goto(url+'/#route');fp.locator('[data-mode=practice]').click()
        fp.goto(url+'/#week');fp.locator('#weekSelect').select_option('L08')
        for task in ['recall','transfer','apply','review']:
            fp.goto(url+'/#week?id=L08&task='+task)
            fp.locator('textarea').fill('Выполнил задачу, проверил допущения по рубрике и записал оставшиеся вопросы.')
            fp.locator('select[data-work]').select_option('yes');fp.locator('[data-action=complete-week]').click()
        fp.goto(url+'/#today')
        assert fp.get_by_role('link',name='Начать занятие',exact=True).get_attribute('href')=='#progress'
        # Help remains attached across new sessions; timed feedback is deferred.
        fp.goto(url+'/#practice');fp.locator('[data-action=start-practice][data-id=L01]').click()
        fp.locator('#questionHint summary').click()
        fp.wait_for_function('(key)=>JSON.parse(localStorage.getItem(key)).exposures.some(x=>x.helpAt)',arg=KEY)
        fp.goto(url+'/#practice');fp.locator('[data-action=start-practice][data-id=L01]').click()
        answer(fp,CONTENT[0]['questions'][0]);a=get_state(fp)['attempts'][-1]
        assert a['assisted'] and a['priorExposure']
        fp.goto(url+'/#exams');fp.locator('[data-action=timed]').click()
        timed_q=BANK[get_state(fp)['sessions']['quiz']['questionIds'][0]]
        answer(fp,timed_q)
        assert 'объяснения откроются после завершения' in fp.locator('.feedback').inner_text()
        assert 'Верный ответ:' not in fp.locator('#main').inner_text()
        # Five daily reviews return to the plan, while extra reviews remain optional.
        first_cards=[c['id'] for l in CONTENT for c in l['cards']][:7]
        fp.evaluate('(args)=>{const s=JSON.parse(localStorage.getItem(args.key));s.reviews=Object.fromEntries(args.ids.map(id=>[id,{dueAt:"2020-01-01",intervalDays:1}]));localStorage.setItem(args.key,JSON.stringify(s));}',{'key':KEY,'ids':first_cards})
        fp.reload();fp.goto(url+'/#review')
        for _ in range(5):
            fp.locator('[data-action=show-card]').click();fp.locator('[data-action=rate-card][data-rating="3"]').click()
        assert fp.get_by_role('heading',name='Порция на сегодня выполнена').is_visible()
        fp.locator('[data-action=more-reviews]').click();assert fp.locator('[data-action=show-card]').is_visible()
        fp.set_viewport_size({'width':390,'height':844});fp.goto(url+'/#week?id=L08')
        fp.screenshot(path=str(ROOT/'tests'/'week-mobile.png'),full_page=True)
        fp.set_viewport_size({'width':1280,'height':900});fp.goto(url+'/#progress')
        fp.screenshot(path=str(ROOT/'tests'/'progress-desktop.png'),full_page=True)
        assert not errors,errors
        features.close()
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
