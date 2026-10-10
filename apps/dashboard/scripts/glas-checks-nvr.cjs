// [fork] glas-checks-nvr.cjs — the NVR views of Glas stage 6 for glas-shots.cjs (docs/glas/PLAN-ETAPPE-6.md §3): a
// stand-in for Sentinel on a documentation address (RFC 5737, never reached), the scenes nvr-… (`shoot --scenes …`)
// and `checks --part nvr`. glas-shots.cjs loads this file with its helpers; it is not run on its own.
//
// The stand-in answers like the plugin (sentinel-nvr docs/API.md; CORS on every answer, OPTIONS): four cameras (a day
// picture, an infrared picture, offline, recording hangs), stats with the clip export, the latest events, the hourly
// chart, a day of clips with events and motion, snapshots, event pictures and segment thumbnails (ffmpeg makes the
// pictures once per run). Playback without a media server: the signalling WebSocket closes at once, so live falls back
// to the picture stream (one JPEG, the player's MJPEG path) and recordings to the native <video> (api/segment = a short
// VP9 file of the same still, so every frame looks alike). Without ffmpeg (with libvpx-vp9) the scenes and the part
// fail; `--no-media` skips them instead and says so.

/* global __g, __n -- helpers in the page (glas-shots.cjs pageHelpers, nvrHelpers below) */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

module.exports = function nvr(h) {
  const { DE, DEVICES, ABORTED, run, settleAnimations, seedScript, FIXED, pageHelpers } = h;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const ORIGIN = 'https://192.0.2.10';
  const BASE = `${ORIGIN}/endpoint/@local/sentinel-nvr/public/`;
  const NVR = { scryptedUrl: BASE, scryptedToken: 'demo' };
  const CODECS = 'avc1.640033,mp4a.40.2';
  const MIN = 60_000;
  const HOUR = 60 * MIN;

  // ---- media: made once per run with ffmpeg ----

  const W = 1280;
  const H = 960;
  // a street with a house in daylight, the same scene in infrared, and two flat pictures for the contrast checks
  // (GLAS-DESIGN §2 rule 5: light grey #C8C8C8 is the realistic worst case, white the extreme one)
  const STILLS = {
    day: ['-f', 'lavfi', '-i', `gradients=s=${W}x${H}:c0=0x9fc3e6:c1=0xe3ebf1:x0=0:y0=0:x1=0:y1=430:speed=0.00001:seed=1`,
      '-f', 'lavfi', '-i', `gradients=s=${W}x530:c0=0xd8d2c4:c1=0xb7b0a0:x0=0:y0=0:x1=0:y1=530:speed=0.00001:seed=1`,
      '-filter_complex', ['[0][1]overlay=0:430:shortest=1', 'drawbox=x=0:y=372:w=1280:h=70:color=0x5d7a52:t=fill',
        'drawbox=x=0:y=360:w=1280:h=14:color=0x6f8d63:t=fill', 'drawbox=x=820:y=150:w=360:h=260:color=0xd9c7ab:t=fill',
        'drawbox=x=800:y=118:w=400:h=40:color=0x8a5a48:t=fill', 'drawbox=x=860:y=220:w=80:h=70:color=0x46525e:t=fill',
        'drawbox=x=1060:y=220:w=80:h=70:color=0x46525e:t=fill', 'drawbox=x=960:y=300:w=70:h=110:color=0x6b4a3a:t=fill',
        'drawbox=x=120:y=560:w=420:h=36:color=0xf2f2ee:t=fill', 'drawbox=x=0:y=700:w=1280:h=260:color=0xa59f90@0.5:t=fill'].join(',')],
    night: ['-f', 'lavfi', '-i', `gradients=s=${W}x${H}:c0=0x1a1c1e:c1=0x3a3d40:x0=0:y0=0:x1=0:y1=960:speed=0.00001:seed=1`,
      '-vf', ['drawbox=x=0:y=600:w=1280:h=360:color=0x4a4c4e:t=fill', 'drawbox=x=0:y=380:w=1280:h=60:color=0x26292b:t=fill',
        'drawbox=x=820:y=160:w=360:h=250:color=0x55585a:t=fill', 'drawbox=x=860:y=230:w=80:h=60:color=0x0e0f10:t=fill',
        'drawbox=x=1060:y=230:w=80:h=60:color=0x0e0f10:t=fill', 'drawbox=x=300:y=640:w=260:h=110:color=0x6a6d70:t=fill',
        'format=gray'].join(',')],
    grey: ['-f', 'lavfi', '-i', `color=c=0xc8c8c8:s=${W}x${H}`],
    white: ['-f', 'lavfi', '-i', `color=c=0xffffff:s=${W}x${H}`],
  };
  let MEDIA;
  /** The pictures as buffers ({} without ffmpeg). */
  function media() {
    if (MEDIA) return MEDIA;
    MEDIA = {};
    let dir = '';
    try {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glas-nvr-'));
      const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'pipe' });
      for (const [name, input] of Object.entries(STILLS)) {
        const still = path.join(dir, name + '.jpg');
        ff([...input, '-frames:v', '1', '-q:v', '3', still]);
        // the event crop / segment thumbnail: the house (day, night) or the same flat colour
        ff(['-i', still, '-vf', 'crop=480:360:760:90,scale=320:240', '-q:v', '4', path.join(dir, name + '-thumb.jpg')]);
        // a recording: a segment's minute of the still (every frame alike, so a screenshot does not depend on the moment)
        ff(['-loop', '1', '-i', still, '-t', '60', '-r', '5', '-vf', 'scale=640:480', '-c:v', 'libvpx-vp9', '-b:v', '0',
          '-crf', '50', '-g', '50', '-deadline', 'realtime', '-cpu-used', '8', '-an', path.join(dir, name + '.webm')]);
        MEDIA[name] = {
          jpg: fs.readFileSync(still),
          thumb: fs.readFileSync(path.join(dir, name + '-thumb.jpg')),
          webm: fs.readFileSync(path.join(dir, name + '.webm')),
        };
      }
    } catch (e) {
      MEDIA = { error: String(e && e.message).split('\n')[0] };
    } finally {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    }
    return MEDIA;
  }
  const haveMedia = () => !media().error;

  // ---- data, relative to `now` ----

  /** Local midnight in Europe/Berlin (the browsers of the checks run there). */
  function berlinMidnight(ms) {
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    const [hh, mm, ss] = f.format(ms).split(':').map(Number);
    return ms - ((hh * 60 + mm) * 60 + ss) * 1000 - (ms % 1000);
  }

  // [camera, minutes ago, classes, score, still running]
  const EVENTS = [
    ['1', 4, ['person'], 0.86, true],
    ['1', 26, ['car'], 0.91],
    ['4', 41, ['person'], 0.78],
    ['1', 58, ['car', 'person'], 0.88],
    ['2', 97, ['animal'], 0.74],
    ['1', 133, ['car'], 0.93],
    ['4', 171, ['person'], 0.81],
    ['1', 214, ['car'], 0.89],
    ['1', 290, ['person'], 0.83],
    ['2', 395, ['person'], 0.77],
    ['1', 520, ['car'], 0.9],
    ['1', 14 * 60 + 20, ['person'], 0.8], // yesterday evening ("gestern" in the strip)
  ];
  const CAMS = [
    { id: '1', name: 'Einfahrt', picture: 'day' },
    { id: '2', name: 'Garage', picture: 'night' },
    { id: '3', name: 'Carport', picture: 'day', online: false },
    { id: '4', name: 'Hof', picture: 'day', stalled: true },
  ];

  function sentinelData(now, opts = {}) {
    const midnight = berlinMidnight(now);
    const cams = (opts.cameras || CAMS).map((c) => ({ ...c, picture: opts.picture || c.picture }));
    const events = EVENTS.filter(([cam]) => cams.some((c) => c.id === cam)).map(([camera, ago, classes, score, open]) => {
      const ts = now - ago * MIN;
      return { camera, ts, startTs: ts - 6000, endTs: open ? now - 2000 : ts + 18000, open: !!open, classes, score };
    });
    const today = (cam) => events.filter((e) => e.camera === cam && e.ts >= midnight);
    const cameras = cams.map((c) => {
      const mine = events.filter((e) => e.camera === c.id);
      const recording = c.recording !== false;
      const online = c.online !== false && !c.stalled;
      return {
        id: c.id, name: c.name, recording, online,
        ...(c.stalled ? { stalled: true, stalledSince: now - 6 * MIN } : {}),
        lastSegmentAt: online ? now - 20_000 : now - 75 * MIN,
        eventsToday: today(c.id).length,
        ...(mine.length ? { lastEventTs: mine[0].ts } : {}),
        latestThumbId: `th-${c.id}-latest`, latestTs: now - 60_000, codecs: CODECS,
        detection: online ? { state: 'ok', mode: 'engine', fps: 5, lastFrameAgoMs: 180 } : { state: 'stalled', mode: 'engine' },
      };
    });
    const recent = events.map((e) => ({ ...e, cameraName: cams.find((c) => c.id === e.camera).name }));
    const buckets = Array(24).fill(0);
    for (const e of events) if (e.ts >= midnight) buckets[Math.floor((e.ts - midnight) / HOUR)]++;
    const stats = {
      cameras: cams.length, recording: cameras.filter((c) => c.recording && c.online).length,
      eventsToday: events.filter((e) => e.ts >= midnight).length, segments: 48_210, bytes: 912e9, earliest: midnight - 13 * 24 * HOUR,
      retentionDays: 14, diskFree: 2.41e12, diskTotal: 3.84e12, minFreeBytes: 100e9, storageOk: true,
      features: ['export'], ...opts.stats,
    };
    /** One camera's day: a minute per segment since yesterday 22:00 (the gap 07:40–07:55 is a recording gap). */
    const clips = (cam, start, end) => {
      const c = cams.find((x) => x.id === cam);
      if (!c) return { clips: [], events: [], motion: [], codecs: CODECS, features: stats.features };
      const first = midnight - 2 * HOUR;
      const last = c.online === false || c.stalled ? now - 75 * MIN : now - 30_000;
      const gap = [midnight + 7 * HOUR + 40 * MIN, midnight + 7 * HOUR + 55 * MIN];
      const out = [];
      for (let t = first; t + MIN <= last; t += MIN) {
        if (t >= gap[0] && t < gap[1]) continue;
        if (t + MIN <= start || t >= end) continue;
        out.push({ id: `seg-${cam}-${t}`, videoId: `seg-${cam}-${t}`, thumbnailId: `th-${cam}-${t}`, startTime: t, duration: MIN });
      }
      const evs = events.filter((e) => e.camera === cam && e.ts >= start && e.ts < end).map((e) => ({
        id: `evt-${e.ts}`, timestamp: e.ts, startTs: e.startTs, endTs: e.endTs, open: e.open, classes: e.classes, score: e.score,
        source: 'object', boxes: e.classes.map((k, i) => ({ class: k, score: e.score, box: [300 + i * 200, 420, 160, 220] })),
      }));
      const motion = evs.map((e) => [e.startTs - 2000, e.endTs + 2000]);
      return { clips: out, events: evs, motion, codecs: CODECS, features: stats.features };
    };
    return { cams, cameras, recent, stats, buckets, clips };
  }

  // ---- the stand-in ----

  const CORS = {
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'Content-Length, Content-Range, Content-Disposition',
    'referrer-policy': 'no-referrer',
  };

  /** Pictures and recordings: they keep answering while `fail` is set (mockSentinel). */
  const MEDIA_ROUTES = new Set(['api/snapshot', 'api/live', 'api/evthumb', 'api/evframe', 'api/thumb', 'api/segment']);

  /**
   * Answer Sentinel's routes in this context (registered after newContext's "only local" route, so it wins). `now`:
   * the data's clock (the paused clock of `shoot`, or real time for the checks). `fail`: every JSON answer with this
   * status (or 'unreachable': aborted); pictures and recordings keep answering, so a failure switched on while a page
   * still loads its pictures cannot break them (the scene nvr-trouble). `picture`: the same picture for every camera
   * ('grey', 'white', 'night', 'day'). `segment: 'hang'`: recordings never arrive (the still stays, "Lädt …").
   * `exchange`: the token exchange answers with this status (default: a token). `delay`: ms before the stats answer
   * (the loading state). Returns a log of the requests; its `set(key, value)` changes an option for every later answer
   * (`fail(v)` = `set('fail', v)`: a refresh that fails after the first load).
   */
  async function mockSentinel(ctx, opts = {}) {
    const now = opts.now != null ? opts.now : Date.now();
    const m = media();
    const d = sentinelData(now, opts);
    const log = [];
    log.set = (key, v) => { opts[key] = v; };
    log.fail = (v) => log.set('fail', v);
    await ctx.routeWebSocket(/^wss?:\/\/192\.0\.2\.10\//, (ws) => {
      log.push('ws ' + ws.url().replace(/^.*\/public\//, ''));
      ws.close();
    });
    await ctx.route(/^https?:\/\/192\.0\.2\.10\//, async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      const name = u.pathname.replace(/^.*\/public\//, '');
      const q = u.searchParams;
      log.push(`${req.method()} ${name}${q.get('camera') ? ' ' + q.get('camera') : ''}`);
      if (req.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-headers': 'Content-Type, x-sentinel-token, Range',
          'access-control-allow-methods': 'GET, POST, OPTIONS' } });
      }
      const json = (body, status = 200) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json',
        'cache-control': 'no-store' }, body: JSON.stringify(body) });
      if (opts.fail && !MEDIA_ROUTES.has(name)) {
        return opts.fail === 'unreachable' ? route.abort('connectionrefused') : json({ error: 'refused' }, opts.fail);
      }
      const cam = d.cams.find((c) => c.id === q.get('camera'));
      const pic = (c) => m[(c && c.picture) || 'day'];
      const image = (buf, cache = 'no-store') => (buf
        ? route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/jpeg', 'cache-control': cache }, body: buf })
        : json({ error: 'no media' }, 404));
      switch (name) {
        case 'api/cameras': return json(d.cameras);
        case 'api/stats':
          if (opts.delay) await sleep(opts.delay);
          return json(d.stats);
        case 'api/token-exchange':
          return opts.exchange && opts.exchange !== 'ok' ? json({ error: 'refused' }, opts.exchange) : json({ token: 'demo' });
        case 'api/recent-events': return json(d.recent.slice(0, Number(q.get('limit')) || 40));
        case 'api/events-histogram': return json({ buckets: d.buckets });
        case 'api/clips': return json(d.clips(q.get('camera'), Number(q.get('start')) || 0, Number(q.get('end')) || Infinity));
        case 'api/snapshot':
          // an offline camera has no fresh picture: the tile falls back to the newest segment thumbnail
          return cam && cam.online !== false ? image(pic(cam) && pic(cam).jpg) : json({ error: 'offline' }, 503);
        case 'api/live': return cam ? image(pic(cam) && pic(cam).jpg) : json({ error: 'no camera' }, 404);
        case 'api/evthumb': return image(pic(cam) && pic(cam).thumb, 'public, max-age=31536000, immutable');
        case 'api/evframe': return image(pic(cam) && pic(cam).jpg, 'public, max-age=31536000, immutable');
        case 'api/thumb': {
          const c = d.cams.find((x) => (q.get('id') || '').startsWith(`th-${x.id}-`));
          return image(pic(c) && pic(c).thumb, 'public, max-age=31536000, immutable');
        }
        case 'api/segment': {
          if (opts.segment === 'hang') return undefined; // never answered: the request stays open until the page goes
          const c = d.cams.find((x) => (q.get('id') || '').startsWith(`seg-${x.id}-`));
          const buf = pic(c) && pic(c).webm;
          if (!buf) return json({ error: 'no media' }, 404);
          // byte ranges like the plugin (206): the browser seeks inside a segment only with them
          const head = { ...CORS, 'content-type': 'video/webm', 'accept-ranges': 'bytes' };
          const rg = /^bytes=(\d*)-(\d*)$/.exec((await req.allHeaders()).range || '');
          if (!rg || (!rg[1] && !rg[2])) return route.fulfill({ status: 200, headers: head, body: buf });
          const from = rg[1] ? Number(rg[1]) : Math.max(0, buf.length - Number(rg[2]));
          const to = rg[1] && rg[2] ? Math.min(Number(rg[2]), buf.length - 1) : buf.length - 1;
          if (from >= buf.length || from > to) {
            return route.fulfill({ status: 416, headers: { ...head, 'content-range': `bytes */${buf.length}` }, body: '' });
          }
          return route.fulfill({ status: 206, headers: { ...head, 'content-range': `bytes ${from}-${to}/${buf.length}` },
            body: buf.subarray(from, to + 1) });
        }
        case 'api/clientlog': return route.fulfill({ status: 204, headers: CORS });
        case 'api/export': {
          const from = Number(q.get('from'));
          const to = Number(q.get('to'));
          return json({ id: 'x1', camera: q.get('camera'), from, to, clipped: false, durationMs: to - from,
            segments: Math.ceil((to - from) / MIN), gaps: [], estBytes: Math.round((to - from) / 1000 * 300_000),
            filename: `Einfahrt-${from}.mp4` }, 202);
        }
        case 'api/export-status':
          return json({ id: q.get('id'), state: 'done', progress: 1, bytes: 9_000_000, filename: 'Einfahrt.mp4', expiresAt: now + 15 * MIN });
        case 'api/export-cancel': return route.fulfill({ status: 204, headers: CORS });
        default:
          // relay-* (no session: the relay never started), livemse (no live stream), anything new
          return json({ error: 'not found' }, 404);
      }
    });
    return log;
  }

  // ---- scenes (taken on the paused clock of `shoot`) ----

  /** The live picture is there: the MJPEG image loaded and the still faded away (or why not). */
  async function liveShown(page) {
    const ok = await page.waitForFunction(() => {
      const img = document.querySelector('.nvr-stage__img');
      return img && !img.classList.contains('hidden') && img.complete && img.naturalWidth > 0;
    }, null, { timeout: 8000 }).then(() => true, () => false);
    await run(page, 200);
    await settleAnimations(page);
    return ok ? '' : 'live picture missing';
  }
  /** A recording shows: the native <video> has a frame and the still is gone (or why not). */
  async function recordingShown(page) {
    const ok = await page.waitForFunction(() => {
      const v = document.querySelector('.nvr-stage video');
      return v && v.readyState >= 2 && v.videoWidth > 0;
    }, null, { timeout: 8000 }).then(() => true, () => false);
    await run(page, 300);
    await settleAnimations(page);
    return ok ? '' : 'recording missing';
  }
  /** Click a tab of the camera page (0 = timeline, 1 = events). */
  const tab = (page, i) => page.evaluate((n) => {
    const b = document.querySelectorAll('.nvr-tabs button')[n];
    if (b) b.click();
    return !!b;
  }, i);

  // the car 26 minutes before the fixed clock (EVENTS), from its start
  const REC_AT = FIXED - 26 * MIN - 6000;
  const prepare = (opts = {}) => (ctx) => mockSentinel(ctx, { now: FIXED, ...opts });
  const withNvr = (extra = {}) => ({ ...NVR, ...extra });
  const NO_NVR = { scryptedUrl: '', scryptedToken: '' };
  let trouble = null; // the stand-in of the running nvr-trouble scene (scenes run one after another)
  const scenes = {
    // the overview: hero, events strip, camera tiles (offline, recording hangs), hourly chart, storage
    'nvr-overview': { path: '/nvr', customization: withNvr(), prepare: prepare(), media: true },
    // the camera page live (day picture, infrared picture)
    'nvr-cam': { path: '/nvr/1', customization: withNvr(), prepare: prepare(), viewport: true, media: true, act: liveShown },
    'nvr-cam-night': { path: '/nvr/2', customization: withNvr(), prepare: prepare(), viewport: true, media: true, act: liveShown },
    // the events tab
    'nvr-cam-events': { path: '/nvr/1', customization: withNvr(), prepare: prepare(), viewport: true, media: true, act: async (page) => {
      const note = await liveShown(page);
      if (note) return note;
      if (!(await tab(page, 1))) return 'no events tab';
      await run(page, 300);
      await settleAnimations(page);
      return '';
    } },
    // a recording from an event of the strip (deep link, native fallback): not deterministic to the second (the
    // badge shows the playing time), so not in the default list
    'nvr-cam-rec': { path: `/nvr/1?at=${REC_AT}&ev=${REC_AT + 6000}`, customization: withNvr(), prepare: prepare(), viewport: true,
      media: true, act: recordingShown },
    // the security page and a room with Sentinel's cameras
    'nvr-security': { path: '/security', customization: withNvr(), prepare: prepare(), media: true },
    'nvr-room': { path: '/room/living_room', customization: withNvr({ nvrCameraRooms: { 1: 'living_room', 4: 'living_room' } }),
      prepare: prepare(), media: true },
    // Sentinel answers 401: the error state with "Erneut versuchen"
    'nvr-error': { path: '/nvr', customization: withNvr(), prepare: prepare({ fail: 401 }) },
    // the storage is gone (hero) and a refresh failed after the first load (banner over stale data)
    'nvr-trouble': { path: '/nvr', customization: withNvr(), media: true,
      prepare: async (ctx) => { trouble = await mockSentinel(ctx, { now: FIXED, stats: { storageOk: false, storageProblem: 'missing' } }); },
      act: async (page) => {
        trouble.fail(503);
        // the poller refreshes when the page becomes visible again (the paused clock never reaches its 10 s)
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        const ok = await page.waitForSelector('.nvr-banner', { timeout: 5000 }).then(() => true, () => false);
        await run(page, 300);
        await settleAnimations(page);
        return ok ? '' : 'no stale banner';
      } },
    // not set up: the setup card with the token, and with the account chosen
    'nvr-setup': { path: '/nvr', customization: NO_NVR },
    'nvr-setup-login': { path: '/nvr', customization: NO_NVR, act: async (page) => {
      const b = page.locator('.g-seg--nvr-auth [role="radio"], .nvr-setup__mode > button').nth(1);
      if (!(await b.count())) return 'no account choice';
      await b.click();
      await run(page, 300);
      await settleAnimations(page);
      return '';
    } },
    // the windows of the overview's head: the connection, the cameras' rooms
    'nvr-setup-window': { path: '/nvr', customization: withNvr(), prepare: prepare(), media: true,
      click: '.nvr-actions > .icon-btn[aria-label="NVR-Verbindung"]' },
    'nvr-rooms': { path: '/nvr', customization: withNvr(), prepare: prepare(), media: true,
      click: '.nvr-actions > .icon-btn[aria-label="Kameras den Räumen zuordnen"]' },
    // the camera page's date and time window
    'nvr-cam-date': { path: '/nvr/1', customization: withNvr(), prepare: prepare(), viewport: true, media: true, act: async (page) => {
      const note = await liveShown(page);
      if (note) return note;
      const chip = page.locator('.nvr-datechip').filter({ visible: true }).first();
      if (!(await chip.count())) return 'no date chip';
      await chip.click();
      await run(page, 400);
      await settleAnimations(page);
      return '';
    } },
  };

  // ---- checks (`checks --part nvr`; real time, plan §3) ----

  /** Console lines the stand-in causes on purpose, only from its address: refused answers (the error states and the
   *  setup's error texts, relay and live MSE without a media server, an offline camera's snapshot) and the refused
   *  connection of "nicht erreichbar". */
  const EXPECTED = /^Failed to load resource: (net::ERR_(FAILED|CONNECTION_REFUSED)|the server responded with a status of (40[1349]|429|503) )/;
  const L = (key) => `[aria-label="${DE[key]}"]`;
  const near = (v, want, tol = 1) => typeof v === 'number' && Math.abs(v - want) <= tol;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  /** Helpers in every document of the NVR checks (`window.__n`). Runs in the page. */
  function nvrHelpers() {
    const lin = (c) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    let cx = null;
    /** Any CSS colour as [r, g, b, a] (through a 1-px canvas, so also color(), oklab() and color-mix() results). */
    const rgba = (css) => {
      if (!cx) {
        const cv = document.createElement('canvas');
        cv.width = 1;
        cv.height = 1;
        cx = cv.getContext('2d', { willReadFrequently: true });
      }
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = 'rgba(0, 0, 0, 0)';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], Math.round((d[3] / 255) * 100) / 100];
    };
    /** Relative luminance of a CSS colour (not opaque: over black, the dark page). */
    const L = (css) => {
      const [r, g, b, a] = rgba(css);
      return Math.round(lum(r * a, g * a, b * a) * 1000) / 1000;
    };
    const pixels = async (b64) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      const c = cv.getContext('2d', { willReadFrequently: true });
      c.drawImage(img, 0, 0);
      return c.getImageData(0, 0, cv.width, cv.height).data;
    };
    window.__n = {
      rgba,
      L,
      /** Contrast of glyphs against what lies under them: `a` = a region with the glyphs, `b` = the same region with the
       *  glyphs and their shadow hidden. Glyph pixels are those that differ (letters, edges, shadow); the worst of them
       *  counts — the background without the shadow, as GLAS-DESIGN §2 computes it. */
      async contrast(a64, b64, fgCss) {
        const [A, B] = await Promise.all([pixels(a64), pixels(b64)]);
        const [fr, fg, fb, fa] = rgba(fgCss);
        let n = 0;
        let worst = Infinity;
        let bgMax = 0;
        for (let i = 0; i < A.length && i < B.length; i += 4) {
          const lb = lum(B[i], B[i + 1], B[i + 2]);
          if (Math.abs(lum(A[i], A[i + 1], A[i + 2]) - lb) < 0.03) continue;
          n++;
          const lf = lum(fr * fa + B[i] * (1 - fa), fg * fa + B[i + 1] * (1 - fa), fb * fa + B[i + 2] * (1 - fa));
          worst = Math.min(worst, (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05));
          bgMax = Math.max(bgMax, lb);
        }
        return { n, ratio: n ? Math.round(worst * 100) / 100 : null, bgMax: Math.round(bgMax * 1000) / 1000 };
      },
    };
    const style = document.createElement('style');
    style.textContent = "[data-n-hide='text'], [data-n-hide='text'] * { color: transparent !important; "
      + '-webkit-text-fill-color: transparent !important; text-shadow: none !important; } '
      + "[data-n-hide='glyph'] { visibility: hidden !important; }";
    const add = () => document.head.appendChild(style);
    if (document.head) add();
    else document.addEventListener('DOMContentLoaded', add, { once: true });
  }

  async function nvrChecks(browser, url, out, opts = {}) {
    if (!haveMedia()) {
      // the stand-in has no pictures and no recordings, so no block could run: red, unless skipping was asked for
      out.nvrMedia = (opts.noMedia ? 'skipped (--no-media): ' : 'needs ffmpeg with libvpx-vp9 (--no-media skips): ')
        + media().error;
      return opts.noMedia === true;
    }
    const pageErrors = [];
    const ran = [];
    const only = opts.only || [];
    const block = async (name, fn) => {
      if (only.length && !only.includes(name)) return;
      ran.push(name);
      try {
        await fn();
      } catch (e) {
        out[name + 'Error'] = String(e && e.message).split('\n')[0].slice(0, 300);
        out[name + 'Ok'] = false;
      }
    };
    const ev = (page, fn, a) => page.evaluate(fn, a);
    const until = (page, fn, a, timeout = 8000) => page.waitForFunction(fn, a, { timeout, polling: 50 }).then(() => true, () => false);

    /** A real-time document of the demo with the stand-in. `extra`: mode, strength, reduce, forced, contrast,
     *  customization (default: Sentinel set up), sentinel (options of the stand-in), safeArea (insets, CDP). */
    const open = async (device, style, p, extra = {}) => {
      const ctx = await browser.newContext({
        ...DEVICES[device], locale: 'de-DE', timezoneId: 'Europe/Berlin', colorScheme: extra.mode || 'light',
        reducedMotion: extra.reduce ? 'reduce' : 'no-preference', forcedColors: extra.forced ? 'active' : 'none',
        contrast: extra.contrast ? 'more' : 'no-preference',
      });
      await ctx.route((u) => !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(u.href), (r) => r.abort());
      const log = await mockSentinel(ctx, extra.sentinel || {});
      await ctx.addInitScript(seedScript({ demo: true, mode: extra.mode || 'light', style, strength: extra.strength || 'clear',
        customization: extra.customization || NVR }));
      await ctx.addInitScript(pageHelpers);
      await ctx.addInitScript(nvrHelpers);
      const page = await ctx.newPage();
      if (extra.safeArea) {
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { left: 0, right: 0, ...extra.safeArea } });
      }
      const errors = [];
      page.on('pageerror', (e) => errors.push('exc: ' + String(e.message).slice(0, 200)));
      page.on('console', (m) => {
        if (m.type() !== 'error' || ABORTED.test(m.text())) return;
        const from = (m.location() && m.location().url) || '';
        if (from.startsWith(ORIGIN + '/') && EXPECTED.test(m.text())) return;
        errors.push('console: ' + m.text().slice(0, 200));
      });
      await page.goto(url + p, { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelector('#root > *') && window.__hapulseDemo, null, { timeout: 15000 });
      await sleep(300);
      const close = async () => {
        if (errors.length) pageErrors.push({ device, style, path: p, errors: errors.slice(0, 3) });
        await ctx.close();
      };
      return { ctx, page, log, close };
    };

    /** In-app navigation (the router listens to popstate). */
    const go = (page, to) => ev(page, (p) => {
      history.pushState({}, '', p);
      dispatchEvent(new PopStateEvent('popstate'));
    }, to);
    /** The camera page plays live (the picture stream's image) or a recording (the native <video> has a frame). */
    const camReady = async (page, want) => {
      const ok = await until(page, (w) => {
        const s = window.__snvr && window.__snvr.state();
        if (!s) return false;
        if (w === 'live') {
          const img = document.querySelector('.nvr-stage__img');
          return s.live && !!img && !img.classList.contains('hidden') && img.complete && img.naturalWidth > 0;
        }
        const v = document.querySelector('.nvr-stage video');
        return !s.live && s.playhead != null && !!v && v.readyState >= 2 && v.videoWidth > 0;
      }, want, 15000);
      if (!ok) throw new Error(`camera page not ${want}: ` + JSON.stringify(await ev(page, () => window.__snvr && window.__snvr.state())));
      await sleep(600); // the still fades out
      await settleAnimations(page);
    };
    /** A recording to open: the car 26 minutes ago (EVENTS), from its start, and the clock of the stand-in. */
    const recording = () => {
      const now = Date.now();
      const at = now - 26 * MIN - 6000;
      return { now, at, path: `/nvr/1?at=${at}&ev=${at + 6000}` };
    };
    /** The frame around the page: the root flag, the dark column, bars, the tab bar's lens, the browser colour. */
    const frame = (page) => ev(page, () => {
      const q = (s) => document.querySelector(s);
      const vis = (s) => !!q(s) && __g.visible(q(s));
      const tabs = q('.app-tabs');
      const meta = q('meta[name="theme-color"]');
      return {
        flag: document.documentElement.hasAttribute('data-g-immersive'),
        scheme: q('.app-content') ? q('.app-content').getAttribute('data-glas-scheme') : null,
        tabs: vis('.app-tabs'),
        chips: vis('.app-chips-mobile'),
        sidebar: vis('.app-sidebar'),
        lens: tabs ? tabs.getAttribute('data-g-lens') : null,
        // the lens may fade in where it is (opacity); gliding or stretching is a move
        lensMoves: __g.anims('.g-tabs__lens').filter((a) => a.ms > 1 && a.props.some((x) => x !== 'opacity')).map((a) => a.name),
        themeColor: meta ? meta.getAttribute('content') : null,
        themeLum: meta && meta.getAttribute('content') ? __n.L(meta.getAttribute('content')) : null,
      };
    });
    /** The camera page's measures (K101). */
    const layout = (page) => ev(page, () => {
      const q = (s) => document.querySelector(s);
      const R = (el) => __g.r(el);
      const cs = (el, p) => getComputedStyle(el, p || null);
      const size = (el) => (el ? [Math.round(R(el).w), Math.round(R(el).h)] : null);
      const head = q('.nvr-cam__head');
      const stage = q('.nvr-stage');
      const back = q('.nvr-cam__head .nvr-iconbtn');
      const h1 = q('.nvr-cam__h1');
      const tabs = q('.nvr-tabs');
      const card = q('.nvr-stage-card');
      const right = q('.nvr-cam__right');
      const pill = q('.nvr-pill-ctl');
      return {
        appearance: q('.nvr-cam') ? q('.nvr-cam').getAttribute('data-nvr-appearance') : null,
        vw: innerWidth,
        vh: innerHeight,
        head: { pos: cs(head).position, y: Math.round(R(head).y), bottom: Math.round(R(head).bottom) },
        stage: { x: Math.round(R(stage).x), y: Math.round(R(stage).y), w: Math.round(R(stage).w), h: Math.round(R(stage).h),
          radius: cs(stage).borderTopLeftRadius },
        back: { size: size(back), radius: cs(back).borderTopLeftRadius, fill: __n.rgba(cs(back).backgroundColor)[3] },
        h1: [cs(h1).fontSize, cs(h1).lineHeight, cs(h1).fontWeight],
        badge: q('.nvr-cam__badge') ? q('.nvr-cam__badge').textContent.trim() : null,
        shade: [cs(stage, '::before').height, cs(stage, '::after').height],
        pill: { h: Math.round(R(pill).h), radius: cs(pill).borderTopLeftRadius },
        pbs: [...document.querySelectorAll('.nvr-pill-ctl .nvr-pb')].map(size),
        bar: Math.round(R(q('.nvr-stage-bar')).h),
        status: cs(q('.nvr-stage-title small')).fontSize,
        seg: { h: Math.round(R(tabs).h), btn: Math.round(R(tabs.querySelector('button')).h), active: tabs.getAttribute('data-active'),
          lens: cs(tabs, '::before').transitionProperty },
        fchip: q('.nvr-fchip') ? Math.round(R(q('.nvr-fchip')).h) : null,
        datechip: q('.nvr-datechip') ? Math.round(R(q('.nvr-datechip')).h) : null,
        tool: size(q('.nvr-vtl .tool')),
        body: Math.round(R(q('.nvr-cam__body')).h),
        rightBottom: Math.round(R(right).bottom),
        card: [cs(card).borderTopWidth, cs(card).borderTopLeftRadius, cs(card).boxShadow],
        right: [cs(right).borderTopWidth, cs(right).borderTopLeftRadius],
      };
    });
    /** What a layout misses of K101 (phone: picture edge to edge under the header; wide: header row above). */
    const layoutBad = (l, wide, insetTop = 0) => {
      const b = [];
      const want = (cond, what) => {
        if (!cond) b.push(what);
      };
      const j = JSON.stringify;
      want(l.appearance === 'immersive', 'appearance ' + l.appearance);
      want(l.pill.h === 52 && l.pill.radius === '26px', 'capsule ' + j(l.pill));
      want(l.pbs.length === 4 && l.pbs.every(([w, h]) => h === 44 && w >= 44), 'capsule buttons ' + j(l.pbs));
      want(l.bar >= 48 && l.status === '13px', `info bar ${l.bar} ${l.status}`);
      want(l.seg.h === 40 && l.seg.btn === 34 && l.seg.active === 'tl' && /translate/.test(l.seg.lens), 'segment ' + j(l.seg));
      want(l.fchip === 32, 'filter ' + l.fchip);
      want(l.datechip === 44, 'date chip ' + l.datechip);
      want(same(l.tool, [36, 36]), 'zoom ' + j(l.tool));
      want(same(l.back.size, [44, 44]), 'back ' + j(l.back));
      want(l.card[0] === '0px' && l.card[2] === 'none', 'picture card ' + j(l.card));
      if (wide) {
        want(l.head.pos !== 'absolute' && l.head.bottom <= l.stage.y, 'header ' + j(l.head));
        want(['50%', '22px'].includes(l.back.radius) && l.back.fill > 0, 'back fill ' + j(l.back));
        want(same(l.h1, ['34px', '41px', '700']), 'title ' + j(l.h1));
        want(l.stage.radius === '18px', 'picture radius ' + l.stage.radius);
        want(l.right[0] === '0px' && l.right[1] === '18px', 'column ' + j(l.right));
      } else {
        want(l.head.pos === 'absolute' && l.head.y === 8 + insetTop, 'header ' + j(l.head));
        // edge to edge, or (an upright iPad) as high as the package lets it, centred: max(12rem, min(46vh, 100dvh - 15rem))
        const cap = Math.max(192, Math.min(0.46 * l.vh, l.vh - 240));
        want(l.stage.y === 0 && (l.stage.x === 0 && l.stage.w === l.vw || near(l.stage.h, cap) && near(l.stage.x, (l.vw - l.stage.w) / 2)),
          'picture ' + j(l.stage));
        want(l.back.radius === '22px', 'back radius ' + l.back.radius);
        want(same(l.h1, ['17px', '22px', '600']), 'title ' + j(l.h1));
        // the top gradient grows with the safe area (the header moves down by it)
        want(same(l.shade, [`${104 + insetTop}px`, '120px']), 'gradients ' + j(l.shade));
        want(near(l.body, l.vh) && near(l.rightBottom, l.vh), `height ${l.body}/${l.rightBottom}/${l.vh}`);
        want(l.card[1] === '0px' && l.right[0] === '0px', 'cards ' + j([l.card, l.right]));
      }
      return b;
    };
    /** Colours in the page (the dark subtree must reach derived values, plan §5), and the sidebar's text. */
    const colours = (page) => ev(page, () => {
      const q = (s) => document.querySelector(s);
      const c = (el, prop = 'color') => (el ? __n.L(getComputedStyle(el)[prop]) : null);
      return {
        root: c(document.documentElement, 'backgroundColor'),
        column: c(q('.app-content'), 'backgroundColor'),
        text: c(q('.nvr-cam')),
        status: c(q('.nvr-stage-title small')),
        tab: c(q('.nvr-tabs .nvr-tabs__tab--active')),
        tabIdle: c(q('.nvr-tabs button:not(.nvr-tabs__tab--active)')),
        playhead: c(q('.nvr-vtl .vcenter'), 'backgroundColor'),
        sidebarText: q('.app-sidebar') && __g.visible(q('.app-sidebar')) ? c(q('.app-sidebar .sidebar-nav__item')) : null,
      };
    });
    /** Contrast of the first visible match: text (its colour against the pixels under its letters) or glyph (its svg). */
    const contrastOf = async (page, sel, kind, nth = 0) => {
      const loc = page.locator(sel).filter({ visible: true }).nth(nth);
      if (!(await loc.count())) return { missing: true };
      const box = await loc.evaluate((el, k) => {
        const t = k === 'glyph' ? el.querySelector('svg') : el;
        if (!t) return null;
        const b = t.getBoundingClientRect();
        return { x: b.left, y: b.top, w: b.width, h: b.height, fg: getComputedStyle(t).color };
      }, kind);
      if (!box) return { missing: true };
      const clip = { x: Math.max(0, Math.floor(box.x) - 3), y: Math.max(0, Math.floor(box.y) - 3), width: Math.ceil(box.w) + 6,
        height: Math.ceil(box.h) + 6 };
      const hide = (on) => loc.evaluate((el, [k, h]) => {
        const t = k === 'glyph' ? el.querySelector('svg') : el;
        if (h) t.setAttribute('data-n-hide', k);
        else t.removeAttribute('data-n-hide');
      }, [kind, on]);
      const a = await page.screenshot({ clip });
      await hide(true);
      const b = await page.screenshot({ clip });
      await hide(false);
      return ev(page, ([x, y, fg]) => __n.contrast(x, y, fg), [a.toString('base64'), b.toString('base64'), box.fg]);
    };

    // 1. The camera page immersive (K101–K104, E13): on the phone and an upright iPad the page owns the screen (no tab or
    //    chip bar, the picture from the top edge, the header over it) and both come back afterwards, the tab bar's lens in
    //    place; from 900 px the sidebar stays. The page and the content column are dark in both modes (also derived
    //    colours), the browser colour too. Measures of K101; safe areas (CDP) and clip mode on a recording; contrast over
    //    light grey, white (reported) and the infrared picture.
    await block('nvrImmersive', async () => {
      const res = {};
      const bad = [];
      for (const [device, mode] of [['phone', 'light'], ['phone', 'dark'], ['ipadUpright', 'light'], ['ipad', 'dark'], ['desktop', 'light'],
        ['desktop', 'dark']]) {
        const key = `${device}-${mode}`;
        const wide = DEVICES[device].viewport.width >= 900;
        const o = await open(device, 'glas', '/', { mode });
        try {
          const before = await frame(o.page);
          await go(o.page, '/nvr/1');
          await camReady(o.page, 'live');
          const on = await frame(o.page);
          const lay = await layout(o.page);
          const col = await colours(o.page);
          await o.page.locator(`.nvr-cam__head ${L('nvr.back')}`).click();
          await until(o.page, () => !document.documentElement.hasAttribute('data-g-immersive') && !!document.querySelector('.nvr-layout'));
          const after = await frame(o.page);
          const b = layoutBad(lay, wide);
          if (!on.flag || on.scheme !== 'dark') b.push('not immersive ' + JSON.stringify(on));
          if (after.flag || after.scheme) b.push('frame stays immersive');
          if (wide) {
            if (!on.sidebar || !after.sidebar) b.push('sidebar');
          } else {
            if (!before.tabs || on.tabs || on.chips) b.push('bars on the page ' + JSON.stringify([before.tabs, on.tabs, on.chips]));
            if (!after.tabs || !after.chips) b.push('bars not back ' + JSON.stringify([after.tabs, after.chips]));
            if (after.lens !== '0' || after.lensMoves.length) b.push(`lens glides (${after.lens}, ${after.lensMoves})`);
          }
          if (!(on.themeLum < 0.02) || after.themeColor !== before.themeColor) b.push(`browser colour ${before.themeColor} → ${on.themeColor} → ${after.themeColor}`);
          if (!(col.root < 0.02 && col.column < 0.02)) b.push('page not dark ' + JSON.stringify([col.root, col.column]));
          if (!(col.text > 0.8 && col.tab > 0.8 && col.playhead > 0.8)) b.push('texts not light ' + JSON.stringify(col));
          if (!(col.status > 0.15 && col.status < 0.75 && col.tabIdle > 0.15 && col.tabIdle < 0.75)) b.push('secondary texts ' + JSON.stringify(col));
          if (wide && !(mode === 'light' ? col.sidebarText < 0.1 : col.sidebarText > 0.6)) b.push('sidebar not in the device mode ' + col.sidebarText);
          res[key] = { bad: b, lay: { head: lay.head, stage: lay.stage, body: lay.body }, col, lens: [before.lens, after.lens], theme: on.themeColor };
          bad.push(...b.map((x) => `${key}: ${x}`));
        } finally {
          await o.close();
        }
      }

      // safe areas of an iPhone with a notch (47 / 34) on a recording; the events list; clip mode
      {
        const r = recording();
        const o = await open('phone', 'glas', r.path, { sentinel: { now: r.now }, safeArea: { top: 47, bottom: 34 } });
        try {
          await camReady(o.page, 'rec');
          const lay = await layout(o.page);
          const sa = await ev(o.page, () => {
            const q = (s) => document.querySelector(s);
            const off = (s, ref) => (q(s) && __g.visible(q(s)) ? Math.round(__g.r(q(ref)).bottom - __g.r(q(s)).bottom) : null);
            return { chip: off('.nvr-datechip', '.nvr-cam__right'), zoom: off('.nvr-vtl .vtl-zoom', '.nvr-vtl'), live: off('.nvr-vtl .livejump', '.nvr-vtl'),
              vtlBottom: Math.round(__g.r(q('.nvr-vtl')).bottom) };
          });
          await o.page.locator('.nvr-tabs button').nth(1).click();
          await until(o.page, () => !!document.querySelector('.nvr-evlist'));
          sa.list = await ev(o.page, () => getComputedStyle(document.querySelector('.nvr-evlist')).paddingBottom);
          await o.page.locator('.nvr-tabs button').nth(0).click();
          await until(o.page, () => !!document.querySelector('.nvr-vtl'));
          await o.page.locator(L('nvr.clip.download')).click();
          await until(o.page, () => !!document.querySelector('.nvr-cam__body--clip .nvr-clipbar'));
          await settleAnimations(o.page);
          const clip = await ev(o.page, () => {
            const q = (s) => document.querySelector(s);
            const vis = (s) => !!q(s) && __g.visible(q(s));
            const st = __g.r(q('.nvr-stage'));
            const head = __g.r(q('.nvr-cam__head'));
            return { stage: { x: Math.round(st.x), w: Math.round(st.w), h: Math.round(st.h), y: Math.round(st.y), bottom: Math.round(st.bottom) },
              vw: innerWidth, vh: innerHeight, head: { y: Math.round(head.y), bottom: Math.round(head.bottom), shown: vis('.nvr-cam__head') },
              bar: vis('.nvr-stage-bar'), tabs: vis('.nvr-tabs'), filters: vis('.nvr-filters'), clipbar: vis('.nvr-clipbar'),
              pad: getComputedStyle(q('.nvr-clipbar')).paddingBottom };
          });
          await o.page.locator(`.nvr-clipbar ${L('nvr.clip.close')}`).click();
          const closed = await until(o.page, () => !document.querySelector('.nvr-cam__body--clip'));
          const b = layoutBad(lay, false, 47).filter((x) => !x.startsWith('badge'));
          if (lay.badge === DE['nvr.live'] || !/\d\d:\d\d:\d\d/.test(lay.badge || '')) b.push('time badge ' + lay.badge);
          // the events list ends above the date chip: 62 px + the inset
          if (!(sa.chip === 44 && sa.zoom === 44 && sa.live === 96 && sa.list === '96px')) b.push('safe area ' + JSON.stringify(sa));
          const st = clip.stage;
          if (!(near(st.h, Math.round(clip.vh * 0.28), 2) && near(st.x, (clip.vw - st.w) / 2, 1) && st.y === 0)) b.push('clip picture ' + JSON.stringify(st));
          if (!(clip.head.shown && clip.head.y === 55 && clip.head.bottom <= st.bottom)) b.push('clip header ' + JSON.stringify(clip.head));
          if (clip.bar || clip.tabs || clip.filters || !clip.clipbar || clip.pad !== '40px' || !closed) b.push('clip mode ' + JSON.stringify(clip));
          res.safeArea = { bad: b, sa, clip };
          bad.push(...b.map((x) => `safe area: ${x}`));
        } finally {
          await o.close();
        }
      }

      // a long name on the phone: between the back button and the action (no overlap), ending in an ellipsis, the time
      // badge kept
      {
        const r = recording();
        const cameras = [{ id: '1', name: 'Garten hinten links am Zaun beim Schuppen', picture: 'day' }];
        const o = await open('phone', 'glas', r.path, { sentinel: { now: r.now, cameras } });
        try {
          await camReady(o.page, 'rec');
          const n = await ev(o.page, () => {
            const q = (s) => document.querySelector(s);
            const rect = (el) => el.getBoundingClientRect();
            const h1 = q('.nvr-cam__h1');
            const name = rect(q('.nvr-cam__name') || h1);
            const back = rect(q('.nvr-cam__head .nvr-iconbtn'));
            const act = rect(q('.nvr-cam__actions'));
            const badge = q('.nvr-cam__badge--time');
            return { left: Math.round(name.left - back.right), right: Math.round(act.left - name.right),
              cut: h1.scrollWidth > h1.clientWidth, badge: !!badge && badge.scrollWidth <= Math.ceil(rect(badge).width) };
          });
          res.longName = n;
          if (!(n.left >= 4 && n.right >= 4 && n.cut && n.badge)) bad.push('long name ' + JSON.stringify(n));
        } finally {
          await o.close();
        }
      }

      // contrast over the picture (GLAS-DESIGN §2 rule 5): light grey and the infrared picture must pass, pure white is
      // reported. Text ≥ 4.5:1 (title, time, "1×"), glyphs ≥ 3:1 (capsule, sound, the header's circles).
      const contrast = {};
      const TEXT = ['title', 'time', 'speed'];
      for (const picture of ['grey', 'night', 'white']) {
        for (const device of ['phone', 'desktop']) {
          const r = recording();
          const o = await open(device, 'glas', r.path, { sentinel: { now: r.now, picture } });
          try {
            await camReady(o.page, 'rec');
            if (device !== 'phone') {
              // a pointer shows the capsule (the package fades it in on hover)
              await o.page.locator('.nvr-stage').hover();
              await until(o.page, () => getComputedStyle(document.querySelector('.nvr-pill-ctl')).opacity === '1');
            }
            const items = {};
            if (device === 'phone') {
              items.title = await contrastOf(o.page, '.nvr-cam__h1', 'text');
              items.time = await contrastOf(o.page, '.nvr-cam__badge--time', 'text');
              for (let i = 0; i < 2; i++) items['head' + i] = await contrastOf(o.page, '.nvr-cam__head .nvr-iconbtn', 'glyph', i);
            }
            items.speed = await contrastOf(o.page, '.nvr-pill-ctl .nvr-pb--speed', 'text');
            for (let i = 0; i < 3; i++) items['ctl' + i] = await contrastOf(o.page, '.nvr-pill-ctl .nvr-pb:not(.nvr-pb--speed)', 'glyph', i);
            items.sound = await contrastOf(o.page, '.nvr-mute', 'glyph');
            const key = `${picture}-${device}`;
            contrast[key] = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v.missing ? 'missing' : v.ratio]));
            for (const [k, v] of Object.entries(items)) {
              if (v.missing || !(v.n >= 10)) bad.push(`contrast ${key} ${k}: no glyphs`);
              else if (picture !== 'white' && v.ratio < (TEXT.includes(k) ? 4.5 : 3)) bad.push(`contrast ${key} ${k}: ${v.ratio}`);
            }
          } finally {
            await o.close();
          }
        }
      }
      out.nvrImmersive = { bad, cases: res, contrast };
      out.nvrImmersiveOk = bad.length === 0;
    });

    // 2. The camera page's functions (J5–J7), the same steps in Klassisch and Glas: deep link to a recording, ±15 s,
    //    pause/play, tempo, sound (the switch; the stand-in's recording has no audio track: audible sound is lab),
    //    snapshot (download), fullscreen, tabs (the running event says "läuft"), class filter, zoom, keyboard, LIVE,
    //    date window (a day and a time), Picture-in-Picture refused in a Home-Screen app (the note offers Safari), clip
    //    mode, "l" for live. Scrub and the relay: lab.
    const keepRun = async (device, style) => {
      const r = recording();
      const res = {};
      const step = async (name, fn) => {
        try {
          res[name] = await fn();
        } catch (e) {
          res[name] = { ok: false, why: String(e && e.message).split('\n')[0].slice(0, 160) };
        }
      };
      const o = await open(device, style, r.path, { sentinel: { now: r.now } });
      const { page } = o;
      const st = () => ev(page, () => window.__snvr.state());
      const ts = () => ev(page, () => window.__snvr.ctl.currentTs());
      const click = (sel) => page.locator(sel).filter({ visible: true }).first().click();
      const blur = () => ev(page, () => document.activeElement && document.activeElement.blur && document.activeElement.blur());
      /** A jump by `want` ms: the playhead lands there (playing on meanwhile). */
      const jump = async (act, want) => {
        const t0 = await ts();
        const w0 = Date.now();
        await act();
        const moved = await until(page, ([a, d, w]) => {
          const t = window.__snvr.ctl.currentTs();
          return t != null && Math.abs(t - (a + d + (Date.now() - w))) < 3500;
        }, [t0, want, w0]);
        const d = (await ts()) - t0 - (Date.now() - w0);
        return { ok: moved && d > want - 3500 && d < want + 1500, d: Math.round(d) };
      };
      try {
        await step('deepLink', async () => {
          await camReady(page, 'rec');
          const s = await st();
          const t = await ts();
          return { ok: !s.live && s.transport === 'native' && t > r.at - 2000 && t < r.at + 20000, transport: s.transport, from: Math.round(t - r.at) };
        });
        await step('back15', () => jump(() => click(L('nvr.player.back15')), -15000));
        await step('fwd15', () => jump(() => click(L('nvr.player.fwd15')), 15000));
        await step('pause', async () => {
          await click(L('nvr.player.pause'));
          const paused = await until(page, () => window.__snvr.state().paused);
          const a = await ts();
          await sleep(700);
          const still = (await ts()) - a;
          await click(L('nvr.player.play'));
          const playing = await until(page, () => !window.__snvr.state().paused);
          const c = await ts();
          await sleep(700);
          const ran = (await ts()) - c;
          return { ok: paused && playing && Math.abs(still) < 150 && ran > 300, still, ran };
        });
        await step('speed', async () => {
          const seq = [];
          for (let i = 0; i < 4; i++) {
            await click('.nvr-pill-ctl .nvr-pb--speed');
            await sleep(120);
            seq.push(`${(await st()).rate}:${(await page.locator('.nvr-pill-ctl .nvr-pb--speed').textContent()).trim()}`);
          }
          return { ok: same(seq, ['2:2×', '4:4×', '8:8×', '1:1×']), seq };
        });
        await step('sound', async () => {
          if (!(await page.locator('.nvr-mute').count())) return { ok: false, why: 'no sound button' };
          await click('.nvr-mute');
          const on = await until(page, () => window.__snvr.state().sound && document.querySelector('.nvr-mute').getAttribute('aria-pressed') === 'true');
          await click('.nvr-mute');
          const off = await until(page, () => !window.__snvr.state().sound);
          return { ok: on && off };
        });
        await step('snapshot', async () => {
          const dl = page.waitForEvent('download', { timeout: 6000 });
          await click(L('nvr.player.snapshot'));
          const d = await dl;
          const name = d.suggestedFilename();
          await d.cancel().catch(() => {});
          return { ok: /^Einfahrt_\d{6}\.jpg$/.test(name), name };
        });
        await step('fullscreen', async () => {
          await click(L('nvr.player.fullscreen'));
          const on = await until(page, () => !!document.fullscreenElement && document.fullscreenElement.classList.contains('nvr-stage'));
          const look = await ev(page, () => {
            const s = document.querySelector('.nvr-stage');
            return { radius: getComputedStyle(s).borderTopLeftRadius, shade: getComputedStyle(s, '::before').display };
          });
          await ev(page, () => document.exitFullscreen());
          const off = await until(page, () => !document.fullscreenElement);
          const glas = style !== 'glas' || (look.radius === '0px' && (device !== 'phone' || look.shade === 'none'));
          return { ok: on && off && glas, look };
        });
        await step('tabs', async () => {
          await page.locator('.nvr-tabs button').nth(1).click();
          const list = await until(page, () => !!document.querySelector('.nvr-evlist') && __g.visible(document.querySelector('.nvr-evlist')));
          const running = await ev(page, () => [...document.querySelectorAll('.nvr-evrow__open')].map((x) => x.textContent.trim()));
          await page.locator('.nvr-tabs button').nth(0).click();
          const back = await until(page, () => !!document.querySelector('.nvr-vtl') && __g.visible(document.querySelector('.nvr-vtl')));
          return { ok: list && back && running.length === 1 && running[0].includes(DE['nvr.events.running']), running };
        });
        await step('filter', async () => {
          // on the events list (the timeline draws only what is in view): the first class off hides its events
          await page.locator('.nvr-tabs button').nth(1).click();
          await until(page, () => !!document.querySelector('.nvr-evlist'));
          const count = () => ev(page, () => document.querySelectorAll('.nvr-evlist .nvr-evrow').length);
          const n0 = await count();
          await click('.nvr-fchip');
          const off = await until(page, () => document.querySelector('.nvr-fchip').getAttribute('aria-pressed') === 'false');
          const n1 = await count();
          await click('.nvr-fchip');
          const on = await until(page, () => document.querySelector('.nvr-fchip').getAttribute('aria-pressed') === 'true');
          const n2 = await count();
          await page.locator('.nvr-tabs button').nth(0).click();
          await until(page, () => !!document.querySelector('.nvr-vtl'));
          return { ok: off && on && n1 > 0 && n1 < n0 && n2 === n0, counts: [n0, n1, n2] };
        });
        await step('zoom', async () => {
          const h = () => ev(page, () => document.querySelector('.nvr-vtl .vtl-scroll').scrollHeight);
          const h0 = await h();
          await click(L('nvr.timeline.zoomIn'));
          await sleep(400);
          const h1 = await h();
          await click(L('nvr.timeline.zoomOut'));
          await sleep(400);
          const h2 = await h();
          return { ok: h1 > h0 * 1.3 && Math.abs(h2 - h0) / h0 < 0.05, heights: [h0, h1, h2] };
        });
        await step('keyboard', async () => {
          await blur();
          await page.keyboard.press('Space');
          const paused = await until(page, () => window.__snvr.state().paused);
          await page.keyboard.press('Space');
          const resumed = await until(page, () => !window.__snvr.state().paused);
          const j = await jump(() => page.keyboard.press('ArrowLeft'), -10000);
          return { ok: paused && resumed && j.ok, d: j.d };
        });
        await step('liveJump', async () => {
          await click('.nvr-vtl .livejump');
          const live = await until(page, () => window.__snvr.state().live, null, 10000);
          const badge = await ev(page, () => (document.querySelector('.nvr-cam__badge--live') || {}).textContent || null);
          return { ok: live && (style !== 'glas' || badge === DE['nvr.live']), badge };
        });
        await step('date', async () => {
          await click('.nvr-datechip__lbl');
          const shown = await until(page, () => !!document.querySelector('.nvr-dt__grid'));
          // yesterday 23:00 (recordings run from 22:00 yesterday)
          const y = await ev(page, () => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return { day: d.getDate(), prevMonth: d.getMonth() !== new Date().getMonth() };
          });
          if (y.prevMonth) await page.locator(L('nvr.date.prevMonth')).click();
          await page.locator('.nvr-dt__d:not(.nvr-dt__d--off):not(:disabled)').filter({ hasText: new RegExp(`^${y.day}$`) }).first().click();
          await page.locator('.nvr-dt__time').fill('23:00');
          await page.locator('.nvr-dt__foot .nvr-btn--primary').click();
          const closed = await until(page, () => !document.querySelector('.nvr-dt__grid'));
          const playing = await until(page, () => {
            const s = window.__snvr.state();
            const v = document.querySelector('.nvr-stage video');
            return !s.live && s.playhead != null && !!v && v.readyState >= 2;
          }, null, 12000);
          const at = await ev(page, () => {
            const d = new Date(window.__snvr.ctl.currentTs());
            const y2 = new Date();
            y2.setDate(y2.getDate() - 1);
            return { yesterday: d.getDate() === y2.getDate() && d.getMonth() === y2.getMonth(), hour: d.getHours() };
          });
          return { ok: shown && closed && playing && at.yesterday && at.hour === 23, at };
        });
        await step('pip', async () => {
          await ev(page, () => {
            Object.defineProperty(navigator, 'standalone', { configurable: true, get: () => true });
            HTMLVideoElement.prototype.requestPictureInPicture = function () {
              return Promise.reject(new DOMException('blocked', 'NotSupportedError'));
            };
          });
          await click(L('nvr.player.pip'));
          const shown = await until(page, () => !!document.querySelector('.nvr-pipnote'));
          const note = await ev(page, () => {
            const n = document.querySelector('.nvr-pipnote');
            const a = n && n.querySelector('.nvr-pipnote__open');
            return n ? { text: n.querySelector('span').textContent, link: a && a.textContent, href: a && a.getAttribute('href') } : null;
          });
          return { ok: shown && note.text === DE['nvr.player.pipHomeScreen'] && note.link === DE['nvr.player.openInSafari']
            && /^x-safari-https:\/\/192\.0\.2\.10\//.test(note.href), note: note && { link: note.link, href: (note.href || '').slice(0, 40) } };
        });
        await step('clip', async () => {
          await click(L('nvr.clip.download'));
          const on = await until(page, () => !!document.querySelector('.nvr-clipbar') && !!document.querySelector('.nvr-cam__right--clip'));
          await click(`.nvr-clipbar ${L('nvr.clip.close')}`);
          const off = await until(page, () => !document.querySelector('.nvr-clipbar'));
          return { ok: on && off };
        });
        await step('keyLive', async () => {
          await blur();
          await page.keyboard.press('l');
          return { ok: await until(page, () => window.__snvr.state().live, null, 10000) };
        });
      } finally {
        await o.close();
      }
      return res;
    };
    await block('nvrKeep', async () => {
      const res = {};
      for (const device of ['phone', 'desktop']) {
        for (const style of ['classic', 'glas']) res[`${device}-${style}`] = await keepRun(device, style);
      }
      const bad = [];
      const names = Object.keys(res['phone-classic']);
      for (const [k, steps] of Object.entries(res)) {
        if (!same(Object.keys(steps), names)) bad.push(`${k}: steps ${Object.keys(steps).join(',')}`);
        for (const [s, v] of Object.entries(steps)) if (!v.ok) bad.push(`${k} ${s}: ${JSON.stringify(v).slice(0, 200)}`);
      }
      out.nvrKeep = { bad, steps: names, lab: ['scrub (relay)', 'relay seek and speed', 'audible sound'], detail: res };
      out.nvrKeepOk = bad.length === 0 && names.length === 17;
    });

    // 3. The other NVR views (J1, J2, J4, J8–J12), the same steps in Klassisch and Glas with the same outcome, plus the
    //    Glas looks of K105 that a check can read (circles 44, radii, the strip's time).
    const overview = (page) => ev(page, () => {
      const q = (s) => document.querySelector(s);
      const all = (s) => [...document.querySelectorAll(s)];
      const txt = (el) => (el ? el.textContent.trim().replace(/\s+/g, ' ') : null);
      const cs = (el) => getComputedStyle(el);
      return {
        actions: all('.nvr-actions > .icon-btn').map((b) => ({ label: b.getAttribute('aria-label'), title: b.getAttribute('title'),
          size: [Math.round(__g.r(b).w), Math.round(__g.r(b).h)], radius: cs(b).borderTopLeftRadius, fill: __n.rgba(cs(b).backgroundColor)[3] })),
        tiles: all('.nvr-layout .nvr-camtile').map((t) => {
          const img = t.querySelector('.nvr-camtile__img');
          return { name: t.getAttribute('aria-label'), badge: txt(t.querySelector('.nvr-camtile__offline')),
            dot: t.querySelector('.nvr-camtile__dot') ? (t.querySelector('.nvr-camtile__dot--off') ? 'off' : 'rec') : null,
            img: img ? ((/api\/(snapshot|thumb)/.exec(img.src) || [])[1] || 'other') + (img.complete && img.naturalWidth > 0 ? '' : ' (not loaded)') : 'placeholder',
            meta: txt(t.querySelector('.nvr-camtile__meta')), radius: cs(t).borderTopLeftRadius };
        }),
        hero: txt(q('.nvr-hero')),
        strip: { n: all('.nvr-layout .nvr-strip__item').length, badges: all('.nvr-layout .nvr-strip .nvr-cbadge').length,
          days: all('.nvr-layout .nvr-strip__day').length,
          img: q('.nvr-strip__img') ? cs(q('.nvr-strip__img')).borderTopLeftRadius : null,
          time: q('.nvr-strip__time') ? [cs(q('.nvr-strip__time')).fontSize, cs(q('.nvr-strip__time')).fontWeight] : null },
        bars: all('.nvr-chart__bar').length,
        meter: !!q('.nvr-meter') && __g.visible(q('.nvr-meter')),
        stats: all('.nvr-stat__value').map(txt),
      };
    });
    const pagesRun = async (style) => {
      const r = {};
      // J1: the routes
      {
        const o = await open('phone', style, '/nvr');
        try {
          r.routes = { overview: await until(o.page, () => !!document.querySelector('.nvr-layout')) };
          await go(o.page, '/nvr/1');
          r.routes.camera = await until(o.page, () => !!document.querySelector('.nvr-cam'));
          await go(o.page, '/nvr/1/unknown');
          r.routes.unknown = await until(o.page, () => location.pathname === '/nvr' && !!document.querySelector('.nvr-layout'));
        } finally {
          await o.close();
        }
      }
      // J2: the overview — head actions, hero, events strip, tiles (offline with the thumbnail, recording hangs), chart,
      //     storage; the connection window prefilled; the rooms window with "Nach Namen vorschlagen" (J9)
      {
        const now = Date.now();
        const o = await open('desktop', style, '/nvr', { sentinel: { now } });
        try {
          await until(o.page, () => {
            const tiles = [...document.querySelectorAll('.nvr-layout .nvr-camtile')];
            return tiles.length === 4 && tiles.every((t) => { const i = t.querySelector('.nvr-camtile__img'); return i && i.complete && i.naturalWidth > 0; });
          }, null, 12000);
          await settleAnimations(o.page); // Glas: the page rises in (g-rise, opacity)
          r.overview = await overview(o.page);
          r.overview.yesterday = EVENTS.filter(([, ago]) => now - ago * MIN < berlinMidnight(now)).length;
          await o.page.locator(`.nvr-actions > ${L('nvr.setup.modalTitle')}`).click();
          await until(o.page, () => !!document.querySelector('[role="dialog"] .nvr-setup__fields'));
          r.connection = await ev(o.page, () => document.querySelector('[role="dialog"] .nvr-setup__fields input[type="url"]').value);
          await o.page.keyboard.press('Escape');
          await until(o.page, () => !document.querySelector('[role="dialog"] .nvr-setup__fields'));
          await o.page.locator(`.nvr-actions > ${L('cameraSource.rooms.title')}`).click();
          const rows = await until(o.page, () => document.querySelectorAll('.nvr-camrooms__row').length === 4);
          await o.page.getByRole('button', { name: DE['cameraSource.rooms.suggest'] }).click();
          const values = await ev(o.page, () => [...document.querySelectorAll('.nvr-camrooms .nvr-select__native')].map((s) => s.value));
          await o.page.getByRole('button', { name: DE['cameraSource.rooms.save'] }).click();
          const closed = await until(o.page, () => !document.querySelector('.nvr-camrooms'));
          const stored = await ev(o.page, () => JSON.parse(localStorage.getItem('hapulse:settings')).state.customization.nvrCameraRooms);
          r.rooms = { rows, values, closed, stored };
        } finally {
          await o.close();
        }
      }
      // J2: a refresh fails after the first load (banner over the last data), the storage is gone (hero)
      {
        const o = await open('desktop', style, '/nvr', { sentinel: { stats: { storageOk: false, storageProblem: 'missing' } } });
        try {
          await until(o.page, () => !!document.querySelector('.nvr-layout'));
          o.log.set('fail', 503);
          await ev(o.page, () => document.dispatchEvent(new Event('visibilitychange')));
          const banner = await until(o.page, () => !!document.querySelector('.nvr-banner'));
          r.trouble = await ev(o.page, () => ({ banner: (document.querySelector('.nvr-banner') || {}).textContent || null,
            danger: !!document.querySelector('.nvr-hero .nvr-pill--danger') }));
          r.trouble.shown = banner;
        } finally {
          await o.close();
        }
      }
      // J4 / J10: the security page's section and a room with Sentinel's cameras
      r.security = {};
      for (const device of ['phone', 'desktop']) {
        const o = await open(device, style, '/security');
        try {
          await until(o.page, () => document.querySelectorAll('.nvr-sec .nvr-camtile').length === 4);
          r.security[device] = await ev(o.page, () => ({ tiles: document.querySelectorAll('.nvr-sec .nvr-camtile').length,
            strip: document.querySelectorAll('.nvr-sec .nvr-strip__item').length,
            meta: ((document.querySelector('.nvr-sec__meta') || {}).textContent || '').trim() }));
          await o.page.locator('.nvr-sec .nvr-home__link').click();
          r.security[device].link = await until(o.page, () => location.pathname === '/nvr');
        } finally {
          await o.close();
        }
      }
      {
        const o = await open('phone', style, '/room/living_room', { customization: { ...NVR, nvrCameraRooms: { 1: 'living_room', 4: 'living_room' } } });
        try {
          await until(o.page, () => document.querySelectorAll('.nvr-room-cams .nvr-camtile').length === 2);
          r.room = await ev(o.page, () => [...document.querySelectorAll('.nvr-room-cams .nvr-camtile')].map((t) => t.getAttribute('aria-label')));
        } finally {
          await o.close();
        }
      }
      // J8: the setup — fields, token or account (Glas: the segment, arrows move the focus only), the test's answers
      {
        const o = await open('phone', style, '/nvr', { customization: NO_NVR });
        const { page, log } = o;
        try {
          await until(page, () => !!document.querySelector('.nvr-setup__fields'));
          const s = {};
          const probe = async () => {
            await page.locator('.nvr-setup .nvr-setup__actions .btn--ghost').click();
            await until(page, () => {
              const p = document.querySelector('.nvr-setup__probe');
              return !!p && !document.querySelector('.nvr-setup .nvr-spin');
            }, null, 12000);
            return ev(page, () => {
              const p = document.querySelector('.nvr-setup__probe');
              return p ? `${p.className.replace(/^.*--/, '')}: ${p.textContent.trim()}` : null;
            });
          };
          s.fields = await ev(page, () => ({ url: !!document.querySelector('.nvr-setup input[type="url"]'),
            modes: document.querySelectorAll('.g-seg--nvr-auth [role="radio"], .nvr-setup__mode > button').length,
            token: !!document.querySelector('.nvr-setup input[type="password"]') }));
          await page.locator('.nvr-setup input[type="url"]').fill(BASE);
          await page.locator('.nvr-setup input[type="password"]').fill('demo');
          s.ok = await probe();
          log.set('fail', 401);
          s.unauthorized = await probe();
          log.set('fail', 'unreachable');
          s.unreachable = await probe();
          log.set('fail', null);
          if (style === 'glas') {
            await page.locator('.g-seg--nvr-auth [role="radio"]').first().focus();
            await page.keyboard.press('ArrowRight');
            s.manual = await ev(page, () => ({ focus: document.activeElement.textContent.trim(),
              account: !!document.querySelector('.nvr-setup input[autocomplete="username"]') }));
            await page.keyboard.press('Space');
          } else await page.locator('.nvr-setup__mode > button').nth(1).click();
          await until(page, () => !!document.querySelector('.nvr-setup input[autocomplete="username"]'));
          await page.locator('.nvr-setup input[autocomplete="username"]').fill('admin');
          await page.locator('.nvr-setup input[autocomplete="current-password"]').fill('secret');
          for (const status of [401, 403, 404, 429]) {
            log.set('exchange', status);
            s['login' + status] = await probe();
          }
          log.set('exchange', 'ok');
          await page.locator('.nvr-setup .nvr-setup__actions .btn--primary').click();
          s.saved = await until(page, () => !!document.querySelector('.nvr-layout'), null, 10000);
          s.stored = await ev(page, () => {
            const c = JSON.parse(localStorage.getItem('hapulse:settings')).state.customization;
            return [c.scryptedUrl, c.scryptedToken];
          });
          r.setup = s;
        } finally {
          await o.close();
        }
      }
      // J12: refused (401) with "Erneut versuchen", unreachable, loading
      {
        const o = await open('phone', style, '/nvr', { sentinel: { fail: 401 } });
        try {
          await until(o.page, () => !!document.querySelector('.page > [role="alert"]'));
          const text = await ev(o.page, () => document.querySelector('.page > [role="alert"]').textContent.trim().replace(/\s+/g, ' '));
          o.log.set('fail', null);
          await o.page.getByRole('button', { name: DE['nvr.error.retry'] }).click();
          r.error = { text, retried: await until(o.page, () => !!document.querySelector('.nvr-layout')) };
        } finally {
          await o.close();
        }
        const u = await open('phone', style, '/nvr', { sentinel: { fail: 'unreachable' } });
        try {
          await until(u.page, () => !!document.querySelector('.page > [role="alert"]'));
          r.error.unreachable = await ev(u.page, () => document.querySelector('.page > [role="alert"]').textContent.includes('erreichbar'));
        } finally {
          await u.close();
        }
        const l = await open('phone', style, '/nvr', { sentinel: { delay: 2500 } });
        try {
          r.error.loading = await ev(l.page, () => ((document.querySelector('.page > [role="status"]') || {}).textContent || '').trim());
          r.error.loaded = await until(l.page, () => !!document.querySelector('.nvr-layout'));
        } finally {
          await l.close();
        }
      }
      // J11: the hint in a camera's detail (Sentinel is the source) leads to the NVR
      {
        const o = await open('desktop', style, '/');
        try {
          await ev(o.page, () => window.__hapulseDemo.openDetail('camera.hallway'));
          const shown = await until(o.page, () => !!document.querySelector('.nvr-camhint'));
          const text = await ev(o.page, () => (document.querySelector('.nvr-camhint__text') || {}).textContent || null);
          await o.page.locator('.nvr-camhint .btn').click();
          r.hint = { shown, text, nav: await until(o.page, () => location.pathname === '/nvr') };
        } finally {
          await o.close();
        }
      }
      return r;
    };
    await block('nvrPages', async () => {
      const classic = await pagesRun('classic');
      const glas = await pagesRun('glas');
      const bad = [];
      const want = (cond, what) => {
        if (!cond) bad.push(what);
      };
      const j = JSON.stringify;
      for (const [style, r] of [['classic', classic], ['glas', glas]]) {
        const ov = r.overview;
        want(Object.values(r.routes).every(Boolean), `${style} routes ${j(r.routes)}`);
        want(same(ov.tiles.map((t) => [t.name, t.badge, t.dot]), [['Einfahrt', null, 'rec'], ['Garage', null, 'rec'],
          ['Carport', DE['nvr.cameras.offline'], 'off'], ['Hof', DE['nvr.cameras.stalled'], 'off']]), `${style} tiles ${j(ov.tiles)}`);
        want(ov.tiles[2].img === 'thumb' && ov.tiles[0].img === 'snapshot', `${style} tile pictures ${j(ov.tiles.map((t) => t.img))}`);
        want(ov.strip.n === EVENTS.length && ov.strip.badges === EVENTS.reduce((n, e) => n + e[2].length, 0) && ov.strip.days === ov.yesterday,
          `${style} strip ${j(ov.strip)} (${ov.yesterday} yesterday)`);
        want(ov.bars === 24 && ov.meter && ov.stats.length > 0, `${style} chart/storage ${j([ov.bars, ov.meter, ov.stats])}`);
        want(ov.actions.length === 2 && ov.actions.every((a) => a.label && a.title === a.label), `${style} head actions ${j(ov.actions)}`);
        want(r.connection === BASE, `${style} connection window ${r.connection}`);
        want(r.rooms.rows && r.rooms.closed && same(r.rooms.values, ['', 'garage', '', '']) && same(r.rooms.stored, { 2: 'garage' }),
          `${style} rooms ${j(r.rooms)}`);
        want(r.trouble.shown && r.trouble.banner === DE['nvr.error.stale'] && r.trouble.danger, `${style} stale/storage ${j(r.trouble)}`);
        want(Object.values(r.security).every((x) => x.tiles === 4 && x.strip === EVENTS.length && x.link), `${style} security ${j(r.security)}`);
        want(same(r.room, ['Einfahrt', 'Hof']), `${style} room ${j(r.room)}`);
        const s = r.setup;
        want(s.fields.url && s.fields.modes === 2 && s.fields.token, `${style} setup fields ${j(s.fields)}`);
        want(s.ok.startsWith('ok:') && s.unauthorized === `fail: ${DE['nvr.setup.testUnauthorized']}` && s.unreachable === `fail: ${DE['nvr.setup.testUnreachable']}`,
          `${style} setup test ${j([s.ok, s.unauthorized, s.unreachable])}`);
        want(s.login401 === `fail: ${DE['nvr.setup.loginFailed']}` && s.login403 === `fail: ${DE['nvr.setup.loginDisabled']}`
          && s.login404 === `fail: ${DE['nvr.setup.loginOld']}` && s.login429 === `fail: ${DE['nvr.setup.loginBusy']}`,
        `${style} setup login ${j([s.login401, s.login403, s.login404, s.login429])}`);
        want(s.saved && s.stored[1] === 'demo' && s.stored[0], `${style} setup save ${j([s.saved, s.stored])}`);
        if (style === 'glas') want(s.manual && s.manual.focus === DE['nvr.setup.authLogin'] && !s.manual.account, `glas segment manual ${j(s.manual)}`);
        want(r.error.text.includes(DE['nvr.error.title']) && r.error.text.includes(DE['nvr.error.unauthorized']) && r.error.retried
          && r.error.unreachable && r.error.loading === DE['nvr.loading'] && r.error.loaded, `${style} error/loading ${j(r.error)}`);
        want(r.hint.shown && r.hint.text === DE['cameraSource.detail.hint'] && r.hint.nav, `${style} hint ${j(r.hint)}`);
      }
      // the same outcome in both styles (looks aside)
      const plain = (r) => j({ ...r, overview: { ...r.overview, actions: r.overview.actions.map((a) => [a.label, a.title]),
        tiles: r.overview.tiles.map((t) => ({ ...t, radius: null })), strip: { ...r.overview.strip, img: null, time: null } },
      setup: { ...r.setup, manual: null } });
      /** Paths where two plain values differ (at most 6). */
      const diff = (a, b, at = '', acc = []) => {
        if (acc.length >= 6) return acc;
        if (a && b && typeof a === 'object' && typeof b === 'object') {
          for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], at + '.' + k, acc);
        } else if (j(a) !== j(b)) acc.push(`${at}: ${j(a)} ≠ ${j(b)}`.slice(0, 240));
        return acc;
      };
      const d = diff(JSON.parse(plain(classic)), JSON.parse(plain(glas)));
      want(!d.length, 'styles differ (classic ≠ glas): ' + d.join(' | '));
      // K105 in Glas: head actions filled circles 44, tiles 18, strip pictures 16, the strip's time 15/600
      const g = glas.overview;
      want(g.actions.every((a) => same(a.size, [44, 44]) && ['50%', '22px', '999px'].includes(a.radius) && a.fill > 0), 'glas head actions ' + j(g.actions));
      want(g.tiles.every((t) => t.radius === '18px') && g.strip.img === '16px' && same(g.strip.time, ['15px', '600']),
        'glas looks ' + j([g.tiles.map((t) => t.radius), g.strip.img, g.strip.time]));
      want(classic.overview.actions.every((a) => same(a.size, [40, 40])), 'classic head actions ' + j(classic.overview.actions));
      out.nvrPages = { bad, glas: { overview: g, setup: glas.setup, security: glas.security } };
      out.nvrPagesOk = bad.length === 0;
    });

    // 4. Reduced motion: no sliding lens on the camera page (the chosen tab's fill fades over in 200 ms), the recording
    //    dot of the tiles stands still (control: it pulses without)
    await block('nvrReducedMotion', async () => {
      const o = await open('phone', 'glas', '/nvr/1', { reduce: true });
      let res;
      try {
        await camReady(o.page, 'live');
        const lens = await ev(o.page, () => getComputedStyle(document.querySelector('.nvr-tabs'), '::before').display);
        await o.page.locator('.nvr-tabs button').nth(1).click();
        let anims = [];
        for (let i = 0; i < 10 && !anims.length; i++) {
          anims = await ev(o.page, () => __g.anims('.nvr-tabs button').filter((a) => a.ms > 1));
          if (!anims.length) await sleep(15);
        }
        await sleep(300);
        const fill = await ev(o.page, () => __n.rgba(getComputedStyle(document.querySelector('.nvr-tabs .nvr-tabs__tab--active')).backgroundColor)[3]);
        res = { lens, anims, fill };
      } finally {
        await o.close();
      }
      const dot = async (reduce) => {
        const p = await open('desktop', 'glas', '/nvr', { reduce });
        try {
          await until(p.page, () => !!document.querySelector('.nvr-layout .nvr-camtile__dot:not(.nvr-camtile__dot--off)'));
          return await ev(p.page, () => getComputedStyle(document.querySelector('.nvr-layout .nvr-camtile__dot:not(.nvr-camtile__dot--off)')).animationName);
        } finally {
          await p.close();
        }
      };
      res.dot = { reduce: await dot(true), normal: await dot(false) };
      out.nvrReducedMotion = res;
      out.nvrReducedMotionOk = res.lens === 'none' && res.anims.length > 0 && res.anims.every((a) => a.ms === 200) && res.fill > 0.1
        && res.dot.reduce === 'none' && res.dot.normal !== 'none';
    });

    // 5. Forced colours: the floating parts of the camera page keep an edge, the playhead stays drawn, the lens is a
    //    ring; the date window's chosen day keeps a ring; tiles and head actions of the overview keep an edge; every
    //    status dot (live, offline, hanging, the hero's problem pill, the home card) is drawn in CanvasText
    await block('nvrForcedColors', async () => {
      const res = {};
      /** The dots under `sel` with their state and fill, and the value of CanvasText (from a probe). */
      const dots = (page, sel) => ev(page, (s) => {
        const probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;forced-color-adjust:none;color:CanvasText';
        document.body.append(probe);
        const ink = getComputedStyle(probe).color;
        probe.remove();
        const state = (d) => {
          if (d.closest('.nvr-pill--danger')) return 'danger';
          const cam = d.closest('[data-state]');
          if (cam) return cam.getAttribute('data-state');
          if (!d.classList.contains('nvr-camtile__dot--off')) return 'ok';
          return d.closest('.nvr-camtile').querySelector(':scope > .nvr-camtile__offline > .lucide-video-off') ? 'stalled' : 'offline';
        };
        return { ink, dots: [...document.querySelectorAll(s)].map((d) => ({ state: state(d), fill: getComputedStyle(d).backgroundColor })) };
      }, sel);
      const allInk = (r, want) => want.every((st) => r.dots.some((d) => d.state === st)) && r.dots.every((d) => d.fill === r.ink);
      const o = await open('phone', 'glas', '/nvr/1', { forced: true });
      try {
        await camReady(o.page, 'live');
        res.cam = await ev(o.page, () => {
          const q = (s) => document.querySelector(s);
          const bw = (s) => (q(s) ? getComputedStyle(q(s)).borderTopWidth : null);
          return { pill: bw('.nvr-pill-ctl'), tabs: bw('.nvr-tabs'), chip: bw('.nvr-datechip'), back: bw('.nvr-cam__head .nvr-iconbtn'),
            tool: bw('.nvr-vtl .tool'), lens: getComputedStyle(q('.nvr-tabs'), '::before').borderTopWidth,
            playhead: __n.rgba(getComputedStyle(q('.nvr-vtl .vcenter')).backgroundColor)[3] };
        });
        await o.page.locator('.nvr-datechip__lbl').click();
        await until(o.page, () => !!document.querySelector('.nvr-dt__d--sel'));
        res.day = await ev(o.page, () => getComputedStyle(document.querySelector('.nvr-dt__d--sel')).borderTopWidth);
      } finally {
        await o.close();
      }
      const ov = await open('desktop', 'glas', '/nvr', { forced: true });
      try {
        await until(ov.page, () => document.querySelectorAll('.nvr-layout .nvr-camtile').length === 4);
        res.overview = await ev(ov.page, () => [...document.querySelectorAll('.nvr-layout .nvr-camtile, .nvr-actions > .icon-btn')]
          .map((t) => getComputedStyle(t).borderTopWidth));
        res.overviewDots = await dots(ov.page, '.nvr-layout :is(.nvr-pill__dot, .nvr-camtile__dot)');
      } finally {
        await ov.close();
      }
      const home = await open('desktop', 'glas', '/', { forced: true });
      try {
        await until(home.page, () => document.querySelectorAll('.g-nvr__cam .g-nvr__dot').length === 4);
        res.homeDots = await dots(home.page, '.g-nvr__cam .g-nvr__dot');
      } finally {
        await home.close();
      }
      out.nvrForcedColors = res;
      out.nvrForcedColorsOk = ['pill', 'tabs', 'chip', 'back', 'tool'].every((k) => res.cam[k] === '1px') && res.cam.lens === '2px'
        && res.cam.playhead === 1 && res.day === '2px' && res.overview.length === 6 && res.overview.every((w) => w === '1px')
        && allInk(res.overviewDots, ['danger', 'ok', 'offline', 'stalled']) && allInk(res.homeDots, ['ok', 'offline', 'stalled']);
    });

    // 6. Opaque glass ("Deckend"; more contrast alike): no backdrop-filter on the camera page and the overview, the
    //    capsule over the picture solid, the date chip without the glass gradient
    await block('nvrOpaque', async () => {
      const res = {};
      for (const [key, device, extra] of [['phone', 'phone', { strength: 'opaque' }], ['desktop', 'desktop', { strength: 'opaque' }],
        ['contrast', 'phone', { contrast: true }]]) {
        const o = await open(device, 'glas', '/nvr/1', extra);
        try {
          await camReady(o.page, 'live');
          res[key] = await ev(o.page, () => ({ glass: document.documentElement.getAttribute('data-glass'), blur: __g.anyBlur(),
            capsule: __n.rgba(getComputedStyle(document.querySelector('.nvr-pill-ctl')).backgroundColor)[3],
            chip: getComputedStyle(document.querySelector('.nvr-datechip')).backgroundImage }));
          await go(o.page, '/nvr');
          await until(o.page, () => !!document.querySelector('.nvr-layout'));
          res[key].overview = await ev(o.page, () => __g.anyBlur());
        } finally {
          await o.close();
        }
      }
      out.nvrOpaque = res;
      out.nvrOpaqueOk = Object.values(res).every((x) => x.glass === 'opaque' && x.blur.length === 0 && x.overview.length === 0
        && x.capsule > 0.5 && x.chip === 'none');
    });

    out.nvrPageErrors = pageErrors;
    return ran.every((k) => out[k + 'Ok']) && pageErrors.length === 0;
  }

  return { scenes, mockSentinel, sentinelData, media, haveMedia, NVR, BASE, liveShown, recordingShown, tab, nvrChecks };
};
