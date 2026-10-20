// 验证批注插件悬浮卡「不再闪烁」。
// 预置一条待发送批注 → 重新 apply → 角标出现 → 悬停 → 卡片出现 →
// 逐帧把指针从角标移到卡片上，卡片必须始终存在（闪烁修复的核心断言）→
// 移出到空白 → 卡片淡出后被移除。
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.SNC_PUPPETEER || 'puppeteer-core');
const SRC = process.env.SNC_ANN || 'C:/Users/52332/.dsh/profiles/desktop/node_modules/@changfenhuang/dsh-annotation/client.js';
const bundleSrc = fs.readFileSync(SRC, 'utf8');

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#fff;font-family:system-ui;font-size:14px}
#flow{padding:20px;max-width:720px}
.bubble{padding:10px 14px;margin:0 0 14px;border-radius:12px;background:#f3f3f3;line-height:1.6}
[data-composer-card]{position:fixed;left:20px;right:20px;bottom:10px;height:90px;background:#fff;border:1px solid #ddd;border-radius:12px}
</style></head><body>
<div data-chat-flow-kind="assistant-step" id="flow">
  <div class="bubble" data-chat-anchor-key="1">第一段文字，正文里包含需要被批注的目标句子，方便定位。</div>
</div>
<div data-composer-card></div>
</body></html>`;

const TARGET = '需要被批注的目标句子';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--no-sandbox'],
});
const tab = await browser.newPage();
await tab.setRequestInterception(true);
tab.on('request', (req) => {
  if (req.url().startsWith('http://ann.local/')) {
    req.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: page });
  } else req.continue();
});
await tab.goto('http://ann.local/');

// 预置会话与一条待发送批注
await tab.evaluate((text) => {
  localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 'test-session-1' }));
  localStorage.setItem('dsh.annotation.pending.v1.test-session-1', JSON.stringify([
    { id: 'q1', text, note: '这是测试批注', seqKey: '1', rowHead: '', textOffset: 6, ctxBefore: '', ctxAfter: '', focusAtEnd: true },
  ]));
}, TARGET);

await tab.evaluate(() => { window.__ModuleLoader__ = { load: (m) => { window.__ANN = m; } }; });
await tab.evaluate(bundleSrc);
const applied = await tab.evaluate(() => {
  try {
    const client = window.__ANN.factory(() => { throw Error('dep'); });
    const noop = () => () => {};
    client.apply({
      effect: (fn) => { fn(); },
      sessions: { get: () => null, on: noop },
      conversation: { on: noop },
      locale: { current: 'zh-CN', subscribe: noop },
    });
    return { ok: true };
  } catch (e) { return { ok: false, err: String(e && e.stack || e) }; }
});
console.log('apply:', JSON.stringify(applied));
await new Promise((r) => setTimeout(r, 700));

const chips = await tab.evaluate(() => [...document.querySelectorAll('[data-ann-chip-for]')].map((c) => {
  const r = c.getBoundingClientRect();
  return { id: c.getAttribute('data-ann-chip-for'), x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}));
console.log('chips:', JSON.stringify(chips));

const n = () => tab.evaluate(() => {
  const layer = document.querySelector('[data-annotation-tip-layer]');
  if (layer === null) return -1;
  const c = layer.firstElementChild;
  return { n: layer.children.length, vis: c ? c.style.visibility || 'visible' : null, op: c ? c.style.opacity : null };
});

console.log('idle          ', JSON.stringify(await n()));
if (chips.length === 0) { console.log('NO CHIP — abort'); await browser.close(); process.exit(1); }


// 埋点：记录卡片被移除的原因
await tab.evaluate(() => {
  window.__trace = [];
  const layer = document.querySelector('[data-annotation-tip-layer]');
  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const r of m.removedNodes) { window.__removedAt = { t: performance.now(), count: (window.__removedCount = (window.__removedCount||0)+1) };
        if (r.nodeType === 1) window.__trace.push('removed:' + (r.className || r.nodeName) + ' stack=' + new Error().stack.split('\\n').slice(1,6).join(' | '));
      }
    }
  }).observe(layer, { childList: true });
  const origShow = true;
});

const chip = chips[0];
await tab.mouse.move(chip.x, chip.y);
await new Promise((r) => setTimeout(r, 220));
const shown = await n();
console.log('hover chip    ', JSON.stringify(shown));

const card = await tab.evaluate(() => {
  const el = document.querySelector('[data-annotation-tip-layer]').firstElementChild;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
console.log('card center   ', JSON.stringify(card));
console.log('card box      ', JSON.stringify(await tab.evaluate(() => { const e = document.querySelector('[data-annotation-tip-layer]').firstElementChild; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; })));

if (!card) {
  console.log('NO CARD after hover — FAIL');
  await browser.close();
  process.exit(1);
}

// 关键断言 A：指针停在角标上，卡片必须持续存在（不被轮询关掉）
const hold = [];
for (let i = 0; i < 8; i++) {
  await new Promise((r) => setTimeout(r, 150));
  hold.push((await n()).n);
}
console.log('hold on chip  ', JSON.stringify(hold));
// 关键断言 B：指针直接进入卡片区域，卡片必须仍在（不能一进去就闪）
await tab.mouse.move(card.x, card.y);
const onCard = [];
for (let i = 0; i < 8; i++) {
  await new Promise((r) => setTimeout(r, 120));
  const s2 = await n();
  const tgt = await tab.evaluate((px, py) => { const e = document.elementFromPoint(px, py); return e ? (e.className || e.nodeName) : 'null'; }, card.x, card.y);
  onCard.push(s2.n + ':' + String(tgt).slice(0, 14));
}
console.log('hold on card  ', JSON.stringify(onCard));
await tab.screenshot({ path: 'shots/ann-hover.png' });
const aliveA = hold.every((v) => v > 0);
const aliveB = onCard.every((v) => v.split(':')[0] > 0);
console.log('RESULT        ', aliveA && aliveB ? 'PASS(no flicker)' : 'FAIL');

await new Promise((r) => setTimeout(r, 200));
console.log('resting card  ', JSON.stringify(await n()));


// 移出到空白处：应当淡出并最终被移除
await tab.mouse.move(6, 420);
await new Promise((r) => setTimeout(r, 60));
console.log('60ms after    ', JSON.stringify(await n()));
await new Promise((r) => setTimeout(r, 400));
console.log('400ms after   ', JSON.stringify(await n()));

await browser.close();
