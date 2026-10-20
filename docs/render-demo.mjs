// node docs/render-demo.mjs — headless Edge + ffmpeg; the real plugin, invented data.
//
// Captures docs/preview.html frame by frame, then encodes the stills into
// docs/images/demo.gif and rewrites the four screenshots in docs/screenshots/.
//
// Two reasons this exists instead of a screen recording of the actual app:
//
//   * privacy   a real recording carries session titles, account and workspace
//               names; the preview page carries invented ones and nothing else
//   * repeat    the timeline is a seekable function, so the same input gives the
//               same bytes, and the assertions below turn the recording into a
//               regression test -- if folding or dragging breaks, this throws
//
// The captured pixels come from the REAL plugin: preview.html injects
// lib/client.js verbatim, so only the surrounding window is imitated.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const EDGE = process.env.SNC_EDGE ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const WIDTH = 1024;
const HEIGHT = 640;
const FPS = 30;
const DURATION = 11;
const FRAMES = FPS * DURATION;

/* the frame -> expectation table. Each entry is a checkpoint the recording has
   to satisfy; a broken plugin fails here rather than producing a plausible but
   wrong animation. */
const CHECKS = [
  { frame: 20,   what: 'starts folded',            test: (s) => assert.equal(s.collapsed, 'true') },
  { frame: 45,   what: 'unfolds on click',         test: (s) => assert.equal(s.collapsed, 'false') },
  { frame: 75,   what: 'enters edit mode',         test: (s) => assert.equal(s.editing, 'true') },
  { frame: 100,  what: 'hides 示例面板 A',          test: (s) => assert.ok(!s.rows.includes('示例面板 A')) },
  { frame: 115,  what: 'hides one more extension', test: (s) => assert.ok(!s.rows.includes('上下文洞察')) },
  { frame: 175,  what: 'drag moved 记忆系统 first', test: (s) => assert.equal(s.first, '记忆系统') },
  { frame: 190,  what: 'hides 编队 tab',            test: (s) => assert.ok(!s.tabs.includes('编队')) },
  { frame: 210,  what: 'hides 画廊 tab',            test: (s) => assert.ok(!s.tabs.includes('画廊')) },
  { frame: 265,  what: 'tab drag reordered',       test: (s) => assert.equal(s.firstTab, '记忆系统') },
  { frame: 290,  what: 'leaves edit mode',         test: (s) => assert.equal(s.editing, 'false') },
  { frame: 325,  what: 'folds again',              test: (s) => assert.equal(s.collapsed, 'true') },
];

const log = (...a) => console.log(...a);

if (!process.env.SNC_KEEP) {
  log('capture plan:', `${FRAMES} frames @ ${FPS}fps, ${WIDTH}x${HEIGHT}`);
}

const temp = await mkdtemp(join(tmpdir(), 'dsh-sidebar-manager-demo-'));
const framesDir = join(temp, 'frames');
await mkdir(framesDir, { recursive: true });
const url = pathToFileURL(join(here, 'preview.html')).href;

log('launching Edge…');
const edge = spawn(EDGE, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--allow-file-access-from-files',
  '--force-device-scale-factor=1',
  '--remote-debugging-port=0',
  `--user-data-dir=${join(temp, 'profile')}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

let socket;
try {
  const ws = await new Promise((resolve, reject) => {
    let buffered = '';
    const timer = setTimeout(() => reject(new Error('Edge did not report a DevTools port in 20s')), 20000);
    edge.stderr.on('data', (chunk) => {
      buffered += chunk;
      const m = buffered.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    edge.on('error', reject);
  });

  socket = new WebSocket(ws);
  await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });

  let seq = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const slot = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) slot.reject(new Error(JSON.stringify(message.error)));
    else slot.resolve(message.result);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);

  await call('Page.enable');
  await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', {
    width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false,
  });
  await call('Page.navigate', { url });

  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails, null, 1));
    return result.result.value;
  };

  for (let i = 0; i < 100; i++) {
    if (await evaluate('typeof window.demoFrame === "function"')) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(await evaluate('typeof window.demoFrame'), 'function', 'preview.html did not boot');

  const checks = new Map(CHECKS.map((c) => [c.frame, c]));
  const states = [];

  for (let frame = 0; frame < FRAMES; frame++) {
    const t = frame / FPS;
    const state = await evaluate(`window.demoFrame(${t})`);
    states.push({ frame, ...state });

    const check = checks.get(frame);
    if (check) {
      try { check.test(state); }
      catch (error) { throw new Error(`frame ${frame}: expected it ${check.what}\n  got ${JSON.stringify(state)}\n  ${error.message}`); }
      log(`  ✓ frame ${String(frame).padStart(3)} — ${check.what}`);
    }

    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(framesDir, `${String(frame).padStart(4, '0')}.png`), Buffer.from(shot.data, 'base64'));
    if (frame % 60 === 0) log(`  captured ${frame}/${FRAMES}`);
  }

  /* ---- stills for README: folded / expanded+hidden / editing ---- */
  const shots = join(repo, 'docs', 'screenshots');
  await mkdir(shots, { recursive: true });
  const stillAt = async (frame, name) => {
    const file = join(framesDir, `${String(frame).padStart(4, '0')}.png`);
    const { readFile } = await import('node:fs/promises');
    await writeFile(join(shots, name), await readFile(file));
    log(`  still ${name} ← frame ${frame}`);
  };
  await stillAt(20, '01-folded.png');
  await stillAt(240, '02-expanded.png');
  await stillAt(130, '03-editing.png');

  /* ---- encode: mp4 master, then a small gif for the README ---- */
  const images = join(repo, 'docs', 'images');
  await mkdir(images, { recursive: true });
  const mp4 = join(temp, 'demo.mp4');
  const gif = join(images, 'demo.gif');

  log('encoding mp4…');
  execFileSync('ffmpeg', [
    '-v', 'error', '-y',
    '-framerate', String(FPS),
    '-i', join(framesDir, '%04d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-map_metadata', '-1', '-an',
    mp4,
  ]);

  log('encoding gif…');
  // 12fps keeps the gestures legible while landing well under a megabyte
  execFileSync('ffmpeg', [
    '-v', 'error', '-y',
    '-i', mp4,
    '-vf', 'fps=12,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a',
    '-loop', '0',
    gif,
  ]);

  const { stat } = await import('node:fs/promises');
  const size = (await stat(gif)).size;
  log('');
  log('done');
  log(`  gif    ${gif}  ${(size / 1024).toFixed(0)} KB`);
  log(`  stills ${shots}`);
  if (size > 900 * 1024) log(`  ! gif is ${(size / 1024).toFixed(0)} KB — consider lowering the scale or fps`);
} finally {
  try { socket?.close(); } catch {}
  edge.kill();
  if (!process.env.SNC_KEEP) await rm(temp, { recursive: true, force: true }).catch(() => {});
  else log(`frames kept in ${temp}`);
}
