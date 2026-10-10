// [fork] nvr-sweep-test.cjs <hapulse-base> <sentinel-origin> <token> [mobile] [glas] — click-through of the native Sentinel
// integration with REAL mouse events, HA in demo mode, the camera data from a real Sentinel: home card (camera + event),
// /nvr overview (tile, event strip), camera page controls (same checks as Sentinel's scripts/ui-sweep-test.js), security
// section. Run with Chromium on :9222 (Sentinel's scripts/cdp-run.sh). Fails on JS exceptions, console errors, HTTP ≥ 400.
// Clip download (package ≥ 0.17.0): clip mode from the info bar and from the event list, an edge set by scrolling, the
// edge holds while the video plays, create → save → the MP4 lands in a temp folder (CDP download events, ffprobe if
// installed), close. `noexport` as an extra argument = Sentinel without features:["export"] → the button must be absent.
// `glas` = the same walk in the Glas style (docs/glas/PLAN-ETAPPE-6.md §3): Glas home card, and the camera page
// immersive (package appearance, root flag; on the phone without tab bar, which comes back on the way back).
const WS = require('ws'), http = require('http'), nodeFs = require('fs'), os = require('os'), pth = require('path'), { spawnSync } = require('child_process');
const BASE = process.argv[2], NVR = process.argv[3], TOKEN = process.argv[4] || '', MOBILE = process.argv.includes('mobile');
const NOEXPORT = process.argv.includes('noexport');
const GLAS = process.argv.includes('glas');
const HOME = GLAS ? { card: '.g-nvr', cam: '.g-nvr__cam', ev: '.g-nvr__ev' } : { card: '.nvr-home', cam: '.nvr-home__cam', ev: '.nvr-home__ev' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u) => new Promise((res, rej) => { http.get(u, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); });
(async () => {
  let t; for (let i = 0; i < 30; i++) { try { t = await getJSON('http://127.0.0.1:9222/json'); if (t.some((x) => x.type === 'page')) break; } catch {} await sleep(500); }
  const page = t.find((x) => x.type === 'page');
  const ws = new WS(page.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 2e8 }); let id = 0; const p = {};
  const errs = [], httpBad = [];
  ws.on('message', (raw) => {
    const m = JSON.parse(raw); if (m.id && p[m.id]) { p[m.id](m); delete p[m.id]; }
    if (m.method === 'Runtime.exceptionThrown') errs.push('exc: ' + String((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text).slice(0, 200));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('console: ' + m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 200));
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) httpBad.push(m.params.response.status + ' ' + m.params.response.url.replace(/token=[^&]+/, 'token=T').slice(-110));
  });
  await new Promise((r) => ws.on('open', r));
  const cmd = (m, pa) => { id++; const _i = id; return new Promise((res) => { p[_i] = res; ws.send(JSON.stringify({ id: _i, method: m, params: pa || {} })); }); };
  const ev = async (e) => { const r = await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result && r.result.exceptionDetails) return { __err: r.result.exceptionDetails.text }; return r.result && r.result.result && r.result.result.value; };
  const until = async (e, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(e)) return true; await sleep(250); } return false; };
  await cmd('Page.enable'); await cmd('Runtime.enable'); await cmd('Network.enable');
  // downloads (clip export) into a temp folder via the browser target; every download must finish (no hanging ones)
  const DL_DIR = nodeFs.mkdtempSync(pth.join(os.tmpdir(), 'hp-clip-'));
  const dls = {};
  let bws = null, bid = 0; const bp = {};
  try {
    const ver = await getJSON('http://127.0.0.1:9222/json/version');
    bws = new WS(ver.webSocketDebuggerUrl, { perMessageDeflate: false });
    bws.on('message', (raw) => {
      const m = JSON.parse(raw); if (m.id && bp[m.id]) { bp[m.id](m); delete bp[m.id]; }
      if (m.method === 'Browser.downloadWillBegin') dls[m.params.guid] = { name: m.params.suggestedFilename, state: 'begin', bytes: 0, t0: Date.now() };
      if (m.method === 'Browser.downloadProgress') { const d = dls[m.params.guid] || (dls[m.params.guid] = { t0: Date.now() }); d.state = m.params.state; d.bytes = m.params.receivedBytes; }
    });
    await new Promise((r) => bws.on('open', r));
    const bcmd = (m, pa) => { bid++; const _i = bid; return new Promise((res) => { bp[_i] = res; bws.send(JSON.stringify({ id: _i, method: m, params: pa || {} })); }); };
    await bcmd('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL_DIR, eventsEnabled: true });
  } catch (e) { errs.push('download setup: ' + String(e).slice(0, 120)); }
  const W = MOBILE ? 390 : 1280, H = MOBILE ? 844 : 900;
  await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: MOBILE ? 3 : 1, mobile: MOBILE, screenWidth: W, screenHeight: H });
  if (MOBILE) await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const settings = { state: { theme: 'aurora', mode: 'light', lastSeenVersion: '99.0.0', lastSeenFork: 99, customization: { scryptedUrl: NVR, scryptedToken: TOKEN, ...(GLAS ? { uiStyle: 'glas' } : {}) } }, version: 0 };
  await cmd('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('hapulse:connection',JSON.stringify({demo:true,mode:'demo'}));if(!sessionStorage.getItem('__seeded')){localStorage.setItem('hapulse:settings',${JSON.stringify(JSON.stringify(settings))});sessionStorage.setItem('__seeded','1');}window.__dl=[];const _c=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){window.__dl.push(this.download);if(/\\.jpe?g$/i.test(this.download))return;}return _c.call(this);};` });
  const steps = [];
  const step = (name, ok, info) => steps.push({ name, ok: !!ok, ...(info !== undefined ? { info } : {}) });
  const click = async (sel, re) => {
    let r = null;
    for (let i = 0; i < 24 && !r; i++) { if (i) await sleep(250); r = await ev(`(()=>{const re=${re ? `new RegExp(${JSON.stringify(re)},'i')` : 'null'};const els=Array.from(document.querySelectorAll(${JSON.stringify(sel)})).filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&(!re||re.test((e.getAttribute('aria-label')||e.textContent||'').trim()))});const e=els[0];if(!e)return null;e.scrollIntoView({block:'center',behavior:'instant'});return new Promise(res=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const b=e.getBoundingClientRect();const x=b.x+b.width/2,y=b.y+b.height/2;const top=document.elementFromPoint(x,y);res(y<0||y>innerHeight||x<0||x>innerWidth||!top||!(top===e||e.contains(top))?null:{x,y,label:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,40)});})));})()`); if (r && r.__err) r = null; }
    if (!r) return null;
    for (const type of ['mousePressed', 'mouseReleased']) await cmd('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
    return r.label;
  };
  const key = async (k, code) => { for (const type of ['keyDown', 'keyUp']) await cmd('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: ({ ' ': 32, Escape: 27, ArrowLeft: 37, ArrowRight: 39 })[k] ?? k.toUpperCase().charCodeAt(0) }); };
  const st = () => ev(`window.__snvr?JSON.stringify(__snvr.state()):null`).then((s) => (s && typeof s === 'string' ? JSON.parse(s) : {}));
  const path = () => ev('location.pathname+location.search');
  const go = async (pth) => { await cmd('Page.navigate', { url: BASE + pth }); };
  let crash = null;
  try {
    // ---------- home card ----------
    await go('/'); await sleep(6000);
    const home = await ev(`JSON.stringify({style:document.documentElement.getAttribute('data-style'),card:!!document.querySelector('${HOME.card}'),cams:document.querySelectorAll('${HOME.cam}').length,evs:document.querySelectorAll('${HOME.ev}').length,imgs:Array.from(document.querySelectorAll('${HOME.card} img')).filter(i=>i.complete&&i.naturalWidth>0).length})`).then(JSON.parse);
    step('home: NVR card with camera, events, images', home.card && home.cams >= 1 && home.evs >= 1 && home.imgs >= 1 && (home.style === 'glas') === GLAS, home);
    await click(HOME.ev);
    step('home event → camera page plays it', await until(`location.pathname.startsWith('/nvr/')&&window.__snvr&&__snvr.state().label==='playing'&&!__snvr.state().live`, 15000), { path: await path(), st: await st() });
    await go('/'); await sleep(4000);
    await click(HOME.cam);
    step('home camera → live', await until(`location.pathname.startsWith('/nvr/')&&window.__snvr&&__snvr.state().live&&__snvr.state().transport==='webrtc'`, 20000), await st());

    // ---------- /nvr overview ----------
    await go('/nvr'); await sleep(5000);
    const ov = await ev(`JSON.stringify({tiles:document.querySelectorAll('.nvr-camtile').length,strip:document.querySelectorAll('.nvr-strip__item').length,imgs:Array.from(document.querySelectorAll('.nvr-camtile__img,.nvr-strip__img img')).filter(i=>i.complete&&i.naturalWidth>0).length})`).then(JSON.parse);
    step('/nvr: tiles, event strip, images', ov.tiles >= 1 && ov.strip >= 1 && ov.imgs >= 2, ov);
    await click('.nvr-strip__item');
    step('strip event → recording', await until(`location.pathname.startsWith('/nvr/')&&window.__snvr&&__snvr.state().label==='playing'&&__snvr.state().transport==='relay'`, 15000), { path: await path() });
    // Glas: the page is immersive (on the phone without the tab bar) and gives the frame back on the way back
    const frame = () => ev(`JSON.stringify({flag:document.documentElement.hasAttribute('data-g-immersive'),page:!!document.querySelector('.nvr-cam[data-nvr-appearance="immersive"]'),tabs:(()=>{const e=document.querySelector('.app-tabs');return !!e&&e.getBoundingClientRect().height>0})()})`).then(JSON.parse);
    if (GLAS) { const f = await frame(); step('glas: camera page immersive', f.flag && f.page && (!MOBILE || !f.tabs), f); }
    await click('button', '^back');
    step('back → /nvr', await until(`location.pathname==='/nvr'`, 5000), { path: await path() });
    if (GLAS) { await sleep(300); const f = await frame(); step('glas: frame back after the camera page', !f.flag && !f.page && (!MOBILE || f.tabs), f); }
    await click('.nvr-camtile');
    step('tile → live WebRTC', await until(`window.__snvr&&__snvr.state().live&&__snvr.state().transport==='webrtc'&&__snvr.ctl.presentedFrames()>3`, 20000), await st());

    // ---------- camera page controls ----------
    const liveDis = await ev(`JSON.stringify(Array.from(document.querySelectorAll('button.nvr-pb')).map(b=>[b.getAttribute('aria-label'),b.disabled]))`);
    step('live: pause, +15 s, speed disabled; −15 s enabled', /"15 s back",false/.test(liveDis) && /"Pause",true/.test(liveDis) && /"15 s forward",true/.test(liveDis) && /"Speed",true/.test(liveDis), liveDis);
    const t0 = Date.now();
    await click('button.nvr-pb', '15 s back');
    const s15ok = await until(`!__snvr.state().live&&__snvr.state().label==='playing'&&__snvr.state().transport==='relay'`, 15000);
    const s15 = await st();
    step('−15 s from live', s15ok && s15.playhead && Math.abs(t0 - 15000 - s15.playhead) < 20000, { lagSec: s15.playhead ? Math.round((t0 - s15.playhead) / 1000) : null });
    await click('button.nvr-pb', '15 s forward');
    step('+15 s at the edge → live', await until(`__snvr.state().live&&__snvr.state().transport==='webrtc'`, 20000), await st());
    await ev(`__snvr.ctl.playAt(Date.now()-3600000,{})`);
    await until(`!__snvr.state().live&&__snvr.state().label==='playing'`, 15000);
    await click('button.nvr-pb', '^pause$');
    step('pause (recording)', await until(`__snvr.state().paused`, 5000));
    await click('button.nvr-pb', '^play$');
    step('play again', await until(`!__snvr.state().paused&&__snvr.state().label==='playing'`, 15000), await st());
    const ph1 = (await st()).playhead;
    await click('button.nvr-pb', '15 s forward'); await sleep(2500);
    const ph2 = (await st()).playhead;
    step('+15 s inside the recording', ph2 - ph1 > 10000 && ph2 - ph1 < 22000 /* lands on the keyframe BEFORE the target (4-s GOP) */, { deltaSec: Math.round((ph2 - ph1) / 1000) });
    await click('button.nvr-pb', '^speed');
    step('speed → 2×', await until(`__snvr.state().rate===2`, 4000));
    for (let i = 0; i < 3; i++) await click('button.nvr-pb', '^speed');
    step('speed back to 1×', await until(`__snvr.state().rate===1`, 4000));
    const m0 = (await st()).muted;
    await click('button.nvr-mute');
    step('sound toggles', await until(`__snvr.state().muted===${!m0}`, 3000));
    await click('button.nvr-mute');
    await click('button.nvr-iconbtn', '^snapshot$');
    step('snapshot → JPEG download', await until(`window.__dl.some(n=>/\\.jpg$/.test(n))`, 5000), { dl: await ev('window.__dl') });
    await click('button.nvr-iconbtn', '^fullscreen$');
    const fs = await until(`!!document.fullscreenElement`, 3000);
    step('fullscreen', fs);
    if (fs) { await ev('document.exitFullscreen()'); await sleep(500); }
    await click('button', '^events');
    const nEv = (await until(`document.querySelectorAll('.nvr-evrow').length>0`, 5000)) ? await ev(`document.querySelectorAll('.nvr-evrow').length`) : 0;
    step('events tab', nEv > 0, { n: nEv });
    await click('button.nvr-fchip'); await sleep(800);
    const nEv2 = await ev(`document.querySelectorAll('.nvr-evrow').length`);
    step('class filter', nEv2 !== nEv, { before: nEv, after: nEv2 });
    await click('button.nvr-fchip'); await sleep(600);
    step('filter off', (await ev(`document.querySelectorAll('.nvr-evrow').length`)) === nEv);
    await click('.nvr-evrow');
    step('event row → plays it', await until(`!__snvr.state().live&&__snvr.state().label==='playing'`, 15000));
    await click('button', '^timeline$');
    step('timeline tab', await until(`document.querySelectorAll('.vev').length>0`, 5000));
    const z0 = await ev(`Math.round((document.querySelector('.vtl-scroll')||{}).scrollHeight||0)`);
    await click('button', '^zoom in$'); await sleep(900);
    const z1 = await ev(`Math.round((document.querySelector('.vtl-scroll')||{}).scrollHeight||0)`);
    step('zoom', z1 !== z0, { z0, z1 });
    await click('button', '^zoom out$');
    await click('button.nvr-datechip__lbl');
    const dlg = await until(`!!document.querySelector('dialog[open], [role=dialog]')`, 3000);
    step('date dialog opens', dlg);
    if (dlg) { await key('Escape', 'Escape'); step('date dialog closes', await until(`!document.querySelector('dialog[open], [role=dialog]')`, 3000)); }
    // the "↑ Live" pill is always there while not live; the chip on the now line only while now is in the rendered window
    await ev(`__snvr.ctl.playAt(Date.now()-120000,{})`);
    await until(`!__snvr.state().live&&__snvr.state().label==='playing'`, 15000);
    const hasPill = await ev(`!!document.querySelector('button.livejump')`);
    step('not live: "↑ Live" pill present', hasPill);
    const chipThere = await ev(`!!document.querySelector('button.vlive-chip')`);
    await click(chipThere ? 'button.vlive-chip' : 'button.livejump');
    step(chipThere ? 'LIVE chip → live' : '"↑ Live" pill → live', await until(`__snvr.state().live&&__snvr.state().transport==='webrtc'`, 20000), await st());
    await ev(`__snvr.ctl.playAt(Date.now()-3600000,{})`);
    await until(`!__snvr.state().live&&__snvr.state().label==='playing'`, 15000);
    await ev('document.activeElement&&document.activeElement.blur()');
    await key(' ', 'Space');
    step('space pauses (recording)', await until(`__snvr.state().paused`, 4000));
    await key(' ', 'Space');
    step('space resumes', await until(`!__snvr.state().paused&&__snvr.state().label==='playing'`, 15000));
    await key('l', 'KeyL');
    step('l → live', await until(`__snvr.state().live`, 20000));

    // ---------- clip download ----------
    // clip bar = .nvr-clipbar (present while clip mode is on); chips read "From14:03:12" (label + time, no space); the band
    // .vclip is only rendered while the range is inside the timeline's window
    const clipInfo = () => ev(`JSON.stringify((()=>{const vis=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0};const lbl=e=>(e.getAttribute('aria-label')||e.textContent||'').replace(/\\s+/g,' ').trim();const bar=document.querySelector('.nvr-clipbar');const find=(re)=>bar?Array.from(bar.querySelectorAll('button,a')).filter(vis).find(e=>re.test(lbl(e))):null;const from=find(/^from(?![a-z])/i),to=find(/^to(?![a-z])/i),create=find(/^create clip$/i),save=find(/^save$/i);const band=document.querySelector('.vclip');return {open:!!bar,band:!!band&&vis(band),from:from?lbl(from):null,to:to?lbl(to):null,create:create?!create.disabled:null,save:save?!(save.disabled||save.getAttribute('aria-disabled')==='true'):null,text:bar?(bar.textContent||'').replace(/\\s+/g,' ').trim().slice(0,160):''}})())`).then((x) => (typeof x === 'string' ? JSON.parse(x) : {}));
    const clipOpen = () => ev(`!!document.querySelector('.nvr-clipbar')`);
    // real input (touch drag on mobile, mouse wheel otherwise; headless ignores Input.synthesizeScrollGesture);
    // dy < 0 = scrollTop shrinks = the line moves to a later time. Falls back to in-page wheel + scrollTop.
    const scrollTimeline = async (dy) => {
      const r = await ev(`(()=>{const e=document.querySelector('.vtl-scroll');if(!e)return null;const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height*0.6,top:e.scrollTop}})()`);
      if (!r || r.__err) return 0;
      const x = Math.round(r.x), y = Math.round(r.y), n = Math.max(4, Math.ceil(Math.abs(dy) / 30));
      if (MOBILE) {
        await cmd('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let i = 1; i <= n; i++) { await sleep(25); await cmd('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(y - (dy * i) / n) }] }); }
        await sleep(60);
        await cmd('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else for (let i = 0; i < n; i++) { await cmd('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy / n }); await sleep(30); }
      await sleep(150);
      let moved = (await ev(`document.querySelector('.vtl-scroll').scrollTop`)) - r.top;
      if (Math.abs(moved) < 2) {
        await ev(`new Promise(res=>{const el=document.querySelector('.vtl-scroll');let i=0;const st=${dy / n};const t=setInterval(()=>{el.dispatchEvent(new WheelEvent('wheel',{deltaY:st,bubbles:true,cancelable:true}));el.scrollTop+=st;if(++i>=${n}){clearInterval(t);res(1)}},30)})`);
        await sleep(150);
        moved = (await ev(`document.querySelector('.vtl-scroll').scrollTop`)) - r.top;
      }
      return moved;
    };
    await ev(`__snvr.ctl.playAt(Date.now()-3600000,{})`);
    await until(`!__snvr.state().live&&__snvr.state().label==='playing'`, 15000);
    const clipBtn = await click('button.nvr-iconbtn', '^download clip$');
    if (NOEXPORT) step('clip: no button without features:["export"] (old Sentinel)', !clipBtn);
    else {
      step('clip: info-bar button opens clip mode on the timeline tab', clipBtn && await until(`!!document.querySelector('.nvr-clipbar')`, 4000), await clipInfo());
      await until(`!!document.querySelector('.vclip')`, 3000); // the band renders with the next timeline frame
      const c0 = await clipInfo();
      step('clip: band, From/To chips, "Create clip" enabled', c0.band && c0.from && c0.to && c0.create === true, c0);
      await click('.nvr-clipbar button', '^to(?![a-z])');
      await scrollTimeline(-60); await sleep(2500);
      const c1 = await clipInfo();
      step('clip: scrolling moves the active edge', c1.to && c1.to !== c0.to, { before: c0.to, after: c1.to });
      await sleep(3000);
      const c2 = await clipInfo();
      step('clip: edge holds while the video plays', c2.to === c1.to && c2.from === c1.from, { to: [c1.to, c2.to], from: [c1.from, c2.from] });
      await click('.nvr-clipbar button', '^to(?![a-z])'); // done with that edge
      const c3 = await clipInfo();
      if (c3.create) {
        await click('.nvr-clipbar button', '^create clip$');
        const sawProgress = await until(`/preparing|loading|ready/i.test((document.querySelector('.nvr-clipbar')||{}).textContent||'')`, 8000);
        const ready = await until(`(()=>{const b=Array.from(document.querySelectorAll('.nvr-clipbar button,.nvr-clipbar a')).find(e=>/^save$/i.test((e.getAttribute('aria-label')||e.textContent||'').trim()));return !!b&&!b.disabled&&b.getAttribute('aria-disabled')!=='true'})()`, 90000);
        step('clip: create → progress → "Save" ready', ready, { sawProgress, info: await clipInfo() });
        if (ready) {
          const n0 = Object.keys(dls).length;
          await click('.nvr-clipbar button, .nvr-clipbar a', '^save$');
          const t1 = Date.now(); let d = null;
          while (Date.now() - t1 < 90000) { d = Object.values(dls).slice(n0).find((x) => x.state === 'completed' || x.state === 'canceled') || null; if (d) break; await sleep(500); }
          const begun = Object.values(dls).slice(n0);
          const file = d && d.name ? pth.join(DL_DIR, d.name) : null;
          const size = file && nodeFs.existsSync(file) ? nodeFs.statSync(file).size : 0;
          let probe = null;
          if (size) { const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file], { encoding: 'utf8' }); if (!r.error) { try { const j = JSON.parse(r.stdout); probe = { dur: Math.round(Number(j.format.duration)), streams: j.streams.map((x) => x.codec_type).join('+') }; } catch { probe = { err: (r.stderr || '').slice(0, 120) }; } } }
          step('clip: "Save" downloads an MP4 (finished, not hanging)', d && d.state === 'completed' && /\.mp4$/i.test(d.name || '') && size > 0 && (!probe || (probe.dur > 0 && /video/.test(probe.streams || ''))), { begun, size, probe });
        }
      } else step('clip: "Create clip" enabled after setting the edge', false, c3);
      await click('.nvr-clipbar button', '^close$');
      step('clip: "Close" leaves clip mode', await until(`!document.querySelector('.nvr-clipbar')`, 4000));
      // per-event button in the event list → clip mode with that event's range, on the timeline tab
      await click('button', '^events');
      await until(`document.querySelectorAll('.nvr-evrow').length>0`, 5000);
      const evBtn = await click('button.nvr-evrow__clip', '^event as clip');
      step('clip: event-list button → clip mode on the timeline tab', evBtn && await until(`!!document.querySelector('.nvr-clipbar')&&!document.querySelector('.nvr-evrow')`, 4000), await clipInfo());
      if (await clipOpen()) { await click('.nvr-clipbar button', '^close$'); await until(`!document.querySelector('.nvr-clipbar')`, 3000); }
      const hanging = Object.values(dls).filter((x) => x.state !== 'completed' && x.state !== 'canceled');
      step('clip: no hanging download', hanging.length === 0, { downloads: Object.values(dls).map((x) => ({ name: x.name, state: x.state, bytes: x.bytes })) });
    }
    await click('button', '^timeline$');

    // ---------- security section ----------
    await go('/security'); await sleep(5000);
    const sec = await ev(`JSON.stringify({sec:!!document.querySelector('.nvr-sec'),tiles:document.querySelectorAll('.nvr-sec .nvr-camtile, .nvr-sec button').length})`).then(JSON.parse);
    step('security: NVR section', sec.sec && sec.tiles >= 1, sec);
    await sleep(1500);
  } catch (e) { crash = String(e.stack || e).slice(0, 400); }
  const failed = steps.filter((s) => !s.ok).map((s) => s.name);
  console.log(JSON.stringify({ mobile: MOBILE, ok: !crash && failed.length === 0 && errs.length === 0 && httpBad.length === 0, crash, failed, errs, http: httpBad, steps }, null, 1));
  try { nodeFs.rmSync(DL_DIR, { recursive: true, force: true }); } catch {}
  if (bws) bws.close();
  ws.close(); process.exit(0);
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
