// [fork] click-fuzz-test.cjs <hapulse-base> [mobile] — HA demo mode: opens every page of the navigation and clicks every
// control in the page content once (re-queried after each click), closes dialogs again (Escape / close button) and
// returns to the page when a click navigated away. Destructive controls (reset/delete/log out/import/…) are skipped.
// Red on JS exceptions, console errors, the page error card ("Something went wrong") or HTTP ≥ 400.
// Output: {pages:[{path,clicked,dialogs,navs,errs}], errs, http, crashes}
const WS = require('ws'), http = require('http');
const BASE = process.argv[2], MOBILE = process.argv.includes('mobile');
const MAX_PER_PAGE = 80;
const SKIP = /reset|delete|remove|log ?out|sign ?out|disconnect|import|clear|entfernen|löschen|abmelden|zurücksetzen|apply to everyone|für alle/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u) => new Promise((res, rej) => { http.get(u, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); });
(async () => {
  let t; for (let i = 0; i < 30; i++) { try { t = await getJSON('http://127.0.0.1:9222/json'); if (t.some((x) => x.type === 'page')) break; } catch {} await sleep(500); }
  const page = t.find((x) => x.type === 'page');
  const ws = new WS(page.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 2e8 }); let id = 0; const p = {};
  let errs = [];
  const allErrs = [], httpBad = [];
  ws.on('message', (raw) => {
    const m = JSON.parse(raw); if (m.id && p[m.id]) { p[m.id](m); delete p[m.id]; }
    const push = (s) => { errs.push(s); allErrs.push(s); };
    if (m.method === 'Runtime.exceptionThrown') push('exc: ' + String((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text).slice(0, 220));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') push('console: ' + m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 220));
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) httpBad.push(m.params.response.status + ' ' + m.params.response.url.slice(-100));
  });
  await new Promise((r) => ws.on('open', r));
  const cmd = (m, pa) => { id++; const _i = id; return new Promise((res) => { p[_i] = res; ws.send(JSON.stringify({ id: _i, method: m, params: pa || {} })); }); };
  const ev = async (e) => { const r = await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result && r.result.exceptionDetails) return { __err: r.result.exceptionDetails.text }; return r.result && r.result.result && r.result.result.value; };
  await cmd('Page.enable'); await cmd('Runtime.enable'); await cmd('Network.enable');
  const W = MOBILE ? 390 : 1280, H = MOBILE ? 844 : 900;
  await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: MOBILE ? 3 : 1, mobile: MOBILE, screenWidth: W, screenHeight: H });
  await cmd('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('hapulse:connection',JSON.stringify({demo:true,mode:'demo'}));if(!sessionStorage.getItem('__seeded')){localStorage.setItem('hapulse:settings',JSON.stringify({state:{theme:'aurora',mode:'light',lastSeenVersion:'99.0.0',lastSeenFork:99},version:0}));sessionStorage.setItem('__seeded','1');}window.confirm=()=>false;window.prompt=()=>null;HTMLAnchorElement.prototype.click=function(){};` });
  const go = async (pth) => { await cmd('Page.navigate', { url: BASE + pth }); await sleep(3000); };
  const errorCard = () => ev(`document.body.innerText.includes('Something went wrong')`);
  const dialogOpen = () => ev(`!!document.querySelector('[role=dialog], dialog[open], .modal, [class*=modal-overlay], [class*=Modal]')`);
  const esc = async () => { for (const type of ['keyDown', 'keyUp']) await cmd('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); };
  // routes from the navigation (sidebar on desktop, tab bar + "more" on mobile → read the router's links from the DOM)
  await go('/');
  let routes = await ev(`Array.from(new Set(Array.from(document.querySelectorAll('a[href^="/"]')).map(a=>a.getAttribute('href')).filter(h=>h&&!h.startsWith('//'))))`);
  if (!Array.isArray(routes)) routes = ['/'];
  for (const extra of ['/', '/room/living_room', '/nvr', '/pool', '/settings', '/security', '/energy', '/music', '/devices', '/automations', '/scenes', '/system', '/rooms']) if (!routes.includes(extra)) routes.push(extra);
  const pages = [];
  for (const route of routes) {
    errs = [];
    await go(route);
    const res = { path: route, clicked: 0, dialogs: 0, navs: 0, errorCard: false, skipped: [] };
    const here = await ev('location.pathname');
    for (let i = 0; i < MAX_PER_PAGE; i++) {
      // the i-th visible control inside the page content (not the app navigation)
      const info = await ev(`(()=>{const root=document.querySelector('main, .app-main, .app-content')||document.body;const els=Array.from(root.querySelectorAll('button, [role=button], [role=switch], [role=tab], input[type=checkbox], select')).filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&!e.disabled&&!e.closest('nav, .app-sidebar, .app-tabs')});const e=els[${i}];if(!e)return null;const lbl=(e.getAttribute('aria-label')||e.textContent||e.getAttribute('title')||'').trim().slice(0,40);if(${SKIP}.test(lbl))return {skip:lbl};if(e.tagName==='SELECT'){return {sel:lbl}};e.scrollIntoView({block:'center',behavior:'instant'});e.click();return {lbl};})()`);
      if (!info || info.__err) break;
      if (info.skip) { res.skipped.push(info.skip); continue; }
      if (info.sel !== undefined) continue;
      res.clicked++;
      await sleep(350);
      if (await dialogOpen()) {
        res.dialogs++;
        await esc(); await sleep(300);
        if (await dialogOpen()) { await ev(`(()=>{const d=document.querySelector('[role=dialog], dialog[open], .modal');const b=d&&Array.from(d.querySelectorAll('button')).find(b=>/close|cancel|schließen|abbrechen|done|fertig|×/i.test((b.getAttribute('aria-label')||b.textContent||'').trim()));if(b)b.click();})()`); await sleep(300); }
        if (await dialogOpen()) { await go(route); }
      }
      const now = await ev('location.pathname');
      if (now !== here) { res.navs++; await go(route); }
      if (await errorCard()) { res.errorCard = true; res.errorAfter = info.lbl; await go(route); }
    }
    res.errs = errs.slice(0, 8);
    pages.push(res);
  }
  const bad = pages.filter((x) => x.errorCard || x.errs.length);
  console.log(JSON.stringify({ mobile: MOBILE, ok: bad.length === 0 && httpBad.length === 0, badPages: bad.map((x) => x.path), http: httpBad.slice(0, 20), totalClicks: pages.reduce((a, x) => a + x.clicked, 0), pages }, null, 1));
  ws.close(); process.exit(0);
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
