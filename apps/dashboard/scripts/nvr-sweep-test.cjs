// [fork] nvr-sweep-test.cjs <hapulse-base> <sentinel-origin> <token> [mobile] — click-through of the native Sentinel
// integration with REAL mouse events, HA in demo mode, the camera data from a real Sentinel: home card (camera + event),
// /nvr overview (tile, event strip), camera page controls (same checks as Sentinel's scripts/ui-sweep-test.js), security
// section. Run with Chromium on :9222 (Sentinel's scripts/cdp-run.sh). Fails on JS exceptions, console errors, HTTP ≥ 400.
const WS = require('ws'), http = require('http');
const BASE = process.argv[2], NVR = process.argv[3], TOKEN = process.argv[4] || '', MOBILE = process.argv.includes('mobile');
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
  const W = MOBILE ? 390 : 1280, H = MOBILE ? 844 : 900;
  await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: MOBILE ? 3 : 1, mobile: MOBILE, screenWidth: W, screenHeight: H });
  if (MOBILE) await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const settings = { state: { theme: 'aurora', mode: 'light', lastSeenVersion: '99.0.0', customization: { scryptedUrl: NVR, scryptedToken: TOKEN } }, version: 0 };
  await cmd('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('hapulse:connection',JSON.stringify({demo:true,mode:'demo'}));if(!sessionStorage.getItem('__seeded')){localStorage.setItem('hapulse:settings',${JSON.stringify(JSON.stringify(settings))});sessionStorage.setItem('__seeded','1');}window.__dl=[];const _c=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){window.__dl.push(this.download);return;}return _c.call(this);};` });
  const steps = [];
  const step = (name, ok, info) => steps.push({ name, ok: !!ok, ...(info !== undefined ? { info } : {}) });
  const click = async (sel, re) => {
    let r = null;
    for (let i = 0; i < 24 && !r; i++) { if (i) await sleep(250); r = await ev(`(()=>{const re=${re ? `new RegExp(${JSON.stringify(re)},'i')` : 'null'};const els=Array.from(document.querySelectorAll(${JSON.stringify(sel)})).filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&(!re||re.test((e.getAttribute('aria-label')||e.textContent||'').trim()))});const e=els[0];if(!e)return null;e.scrollIntoView({block:'center',behavior:'instant'});return new Promise(res=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const b=e.getBoundingClientRect();const x=b.x+b.width/2,y=b.y+b.height/2;res(y<0||y>innerHeight||x<0||x>innerWidth?null:{x,y,label:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,40)});})));})()`); if (r && r.__err) r = null; }
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
    const home = await ev(`JSON.stringify({card:!!document.querySelector('.nvr-home'),cams:document.querySelectorAll('.nvr-home__cam').length,evs:document.querySelectorAll('.nvr-home__ev').length,imgs:Array.from(document.querySelectorAll('.nvr-home img')).filter(i=>i.complete&&i.naturalWidth>0).length})`).then(JSON.parse);
    step('home: NVR card with camera, events, images', home.card && home.cams >= 1 && home.evs >= 1 && home.imgs >= 1, home);
    await click('.nvr-home__ev');
    step('home event → camera page plays it', await until(`location.pathname.startsWith('/nvr/')&&window.__snvr&&__snvr.state().label==='playing'&&!__snvr.state().live`, 15000), { path: await path(), st: await st() });
    await go('/'); await sleep(4000);
    await click('.nvr-home__cam');
    step('home camera → live', await until(`location.pathname.startsWith('/nvr/')&&window.__snvr&&__snvr.state().live&&__snvr.state().transport==='webrtc'`, 20000), await st());

    // ---------- /nvr overview ----------
    await go('/nvr'); await sleep(5000);
    const ov = await ev(`JSON.stringify({tiles:document.querySelectorAll('.nvr-camtile').length,strip:document.querySelectorAll('.nvr-strip__item').length,imgs:Array.from(document.querySelectorAll('.nvr-camtile__img,.nvr-strip__img img')).filter(i=>i.complete&&i.naturalWidth>0).length})`).then(JSON.parse);
    step('/nvr: tiles, event strip, images', ov.tiles >= 1 && ov.strip >= 1 && ov.imgs >= 2, ov);
    await click('.nvr-strip__item');
    step('strip event → recording', await until(`location.pathname.startsWith('/nvr/')&&window.__snvr&&__snvr.state().label==='playing'&&__snvr.state().transport==='relay'`, 15000), { path: await path() });
    await click('button', '^back');
    step('back → /nvr', await until(`location.pathname==='/nvr'`, 5000), { path: await path() });
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
    const z0 = await ev(`document.querySelectorAll('.vtick').length`);
    await click('button', '^zoom in$'); await sleep(900);
    const z1 = await ev(`document.querySelectorAll('.vtick').length`);
    step('zoom', z1 !== z0, { z0, z1 });
    await click('button', '^zoom out$');
    await click('button.nvr-datechip__lbl');
    const dlg = await until(`!!document.querySelector('dialog[open], [role=dialog]')`, 3000);
    step('date dialog opens', dlg);
    if (dlg) { await key('Escape', 'Escape'); step('date dialog closes', await until(`!document.querySelector('dialog[open], [role=dialog]')`, 3000)); }
    // the "↑ Live" pill is always there while not live; the chip on the now line only while now is in the rendered window
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

    // ---------- security section ----------
    await go('/security'); await sleep(5000);
    const sec = await ev(`JSON.stringify({sec:!!document.querySelector('.nvr-sec'),tiles:document.querySelectorAll('.nvr-sec .nvr-camtile, .nvr-sec button').length})`).then(JSON.parse);
    step('security: NVR section', sec.sec && sec.tiles >= 1, sec);
    await sleep(1500);
  } catch (e) { crash = String(e.stack || e).slice(0, 400); }
  const failed = steps.filter((s) => !s.ok).map((s) => s.name);
  console.log(JSON.stringify({ mobile: MOBILE, ok: !crash && failed.length === 0 && errs.length === 0 && httpBad.length === 0, crash, failed, errs, http: httpBad, steps }, null, 1));
  ws.close(); process.exit(0);
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
