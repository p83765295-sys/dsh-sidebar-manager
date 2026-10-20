// 复现并验证用户报的三条症状：
//   A 悬停角标只有悬浮窗、没有高亮
//   B 指针移到空白处悬浮窗不消失
//   C 滚动时悬浮窗钉在原位不跟随
// 覆盖场景：2 条以上批注 + 跨多个 rect 的长文本 + 会话切换。
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.SNC_PUPPETEER || 'puppeteer-core');
const SRC = process.env.SNC_ANN || 'C:/Users/52332/.dsh/profiles/desktop/node_modules/@changfenhuang/dsh-annotation/client.js';
const bundleSrc = fs.readFileSync(SRC, 'utf8');

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#fff;font-family:system-ui;font-size:14px}
#scroller{height:100%;overflow-y:auto}
#flow{padding:20px 24px;max-width:760px}
.bubble{padding:12px 16px;margin:0 0 16px;border-radius:12px;background:#f4f4f5;line-height:1.75}
.spacer{height:1400px}
[data-composer-card]{position:fixed;left:20px;right:20px;bottom:10px;height:90px;background:#fff;border:1px solid #ddd;border-radius:12px}
</style></head><body>
<div id="scroller"><div data-chat-flow-kind="assistant-step" id="flow">
  <div class="bubble" data-chat-anchor-key="7">
    <p>先按你的要求逐条回应两条批注，这两条内容相同，我把它们并成一条讲，不重复。</p>
    <p><strong>Annotation 1：只有当前这个对话的输出结果进行批注，才会异常，这是示例 1</strong></p>
    <p>收到，这条补充了一个关键区别：异常范围是当前会话里两个及以上批注。</p>
    <p><strong>Annotation 2：只有当前这个对话的输出结果进行批注，才会异常，这是示例 2</strong></p>
    <p>同样收到，与 Annotation 1 一致，而且你标注了两处，正好凑成两个及以上这个条件。</p>
  </div>
  <div class="spacer"></div>
</div></div>
<div data-composer-card></div>
</body></html>`;

// 两条批注：都跨多个段落 → 多个 rect
const QUOTES = [
  { id: 'q1', text: '只有当前这个对话的输出结果进行批注，才会异常，这是示例 1', note: '第一条批注', seqKey: '7', textOffset: 40, focusAtEnd: true },
  { id: 'q2', text: '只有当前这个对话的输出结果进行批注，才会异常，这是示例 2', note: '第二条批注', seqKey: '7', textOffset: 300, focusAtEnd: true },
];

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--no-sandbox'],
});
const tab = await browser.newPage();
await tab.setViewport({ width: 900, height: 700 });
await tab.setRequestInterception(true);
tab.on('request', (req) => {
  if (req.url().startsWith('http://ann.local/')) {
    req.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: page });
  } else req.continue();
});
await tab.goto('http://ann.local/');

await tab.evaluate((quotes) => {
  localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 'sess-A' }));
  localStorage.setItem('dsh.annotation.pending.v1.sess-A', JSON.stringify(quotes));
}, QUOTES);

await tab.evaluate(() => { window.__ModuleLoader__ = { load: (m) => { window.__ANN = m; } }; });
await tab.evaluate(bundleSrc);
await tab.evaluate(() => {
  const client = window.__ANN.factory(() => { throw Error('dep'); });
  const noop = () => () => {};
  client.apply({
    effect: (fn) => { fn(); },
    sessions: { get: () => null, on: noop },
    conversation: { on: noop },
    locale: { current: 'zh-CN', subscribe: noop },
  });
  return true;
});
await new Promise((r) => setTimeout(r, 800));

const state = () => tab.evaluate(() => {
  const layer = document.querySelector('[data-annotation-tip-layer]');
  const card = layer ? layer.firstElementChild : null;
  const cr = card ? card.getBoundingClientRect() : null;
  return {
    cardCount: layer ? layer.children.length : -1,
    cardTop: cr ? Math.round(cr.top) : null,
    hlTotal: document.querySelectorAll('[data-ann-hl-for]').length,
    hlVisible: [...document.querySelectorAll('[data-ann-hl-for]')].filter((e) => e.style.display !== 'none').length,
    chips: [...document.querySelectorAll('[data-ann-chip-for]')].map((c) => {
      const r = c.getBoundingClientRect();
      return { id: c.getAttribute('data-ann-chip-for'), x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), hidden: c.style.display === 'none' };
    }),
  };
});

const s0 = await state();
console.log('BOOT          ', JSON.stringify({ hlTotal: s0.hlTotal, hlVisible: s0.hlVisible, chips: s0.chips.length }));
console.log('chips detail  ', JSON.stringify(s0.chips));

const chip = s0.chips.find((c) => c.id === 'q1');
if (!chip) { console.log('NO CHIP q1 — abort'); await browser.close(); process.exit(1); }

// ---- A：悬停角标必须同时出现「卡片」和「高亮」 ----
await tab.mouse.move(chip.x, chip.y);
await new Promise((r) => setTimeout(r, 250));
const sA = await state();
console.log('A hover       ', JSON.stringify({ card: sA.cardCount, hlVisible: sA.hlVisible }));
const passA = sA.cardCount > 0 && sA.hlVisible > 0;
console.log('A RESULT      ', passA ? 'PASS' : 'FAIL(no highlight)');

// ---- C：滚动后卡片必须仍紧邻被悬停的角标（不是钉在旧位置） ----
// 口径：卡片是 fixed 定位，滚动时只要「卡片与角标的相对关系」保持在三段式
// 允许的几种布局之一，就算跟随成功；贴顶时上方放不下会退到右侧/下方，属正常。
const CHIP_ID = 'q1';
const before = await state();
const follow = await tab.evaluate((id) => {
  const sc = document.getElementById('scroller');
  const layer = () => document.querySelector('[data-annotation-tip-layer]');
  const snap = () => {
    const c = layer().firstElementChild;
    const chip = document.querySelector(`[data-ann-chip-for="${id}"]`);
    const cr = chip.getBoundingClientRect();
    const r = c ? c.getBoundingClientRect() : null;
    return {
      card: r ? { top: Math.round(r.top), left: Math.round(r.left), bottom: Math.round(r.bottom), right: Math.round(r.right) } : null,
      chip: { top: Math.round(cr.top), left: Math.round(cr.left), bottom: Math.round(cr.bottom), right: Math.round(cr.right) },
    };
  };
  const t0 = snap();
  sc.scrollTop = 60;
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res({ t0, t1: snap(), scrollTop: sc.scrollTop }))));
}, CHIP_ID);
const rel = (s) => {
  if (!s.card) return null;
  // 卡片在角标正上方时 chip.top - card.bottom ≈ 8；翻到下方时 card.top - chip.bottom ≈ 8。
  const gapAbove = s.chip.top - s.card.bottom;
  const gapBelow = s.card.top - s.chip.bottom;
  return { gapAbove, gapBelow };
};
const r0 = rel(follow.t0);
const r1 = rel(follow.t1);
console.log('C scroll      ', JSON.stringify({ ...follow, rel0: r0, rel1: r1 }));
// 跟随成功后：卡片要么仍贴在角标上方（间隙≈8），要么角标贴近视口顶部时翻到下方（间隙≈8）。
const followOk = follow.t1.card !== null
  && ((Math.abs(r1.gapAbove - 8) <= 2) || (Math.abs(r1.gapBelow - 8) <= 2));
const chipMoved = follow.t0.chip.top - follow.t1.chip.top;
const passC = followOk && Math.abs(chipMoved - follow.scrollTop) <= 2;
console.log('C RESULT      ', passC ? 'PASS' : `FAIL(chipMoved=${chipMoved})`);
// 恢复指针状态，后续用例重新悬停
await tab.mouse.move(870, 300);
await new Promise((r) => setTimeout(r, 300));

// ---- D：滚动到角标离开视口，卡片必须收掉 ----
await tab.evaluate(() => { document.getElementById('scroller').scrollTop = 1200; });
await new Promise((r) => setTimeout(r, 400));
const sD = await state();
console.log('D scrolled-out', JSON.stringify({ card: sD.cardCount, chips: sD.chips.length }));
console.log('D RESULT      ', sD.cardCount === 0 ? 'PASS' : 'FAIL(card left behind)');

// 回到原位
await tab.evaluate(() => { document.getElementById('scroller').scrollTop = 0; });
await new Promise((r) => setTimeout(r, 400));

// ---- B：指针移到空白处，卡片必须消失 ----
await tab.mouse.move(chip.x, chip.y);
await new Promise((r) => setTimeout(r, 250));
const beforeB = await state();
await tab.mouse.move(870, 300);
await new Promise((r) => setTimeout(r, 400));
const sB = await state();
console.log('B leave       ', JSON.stringify({ before: beforeB.cardCount, after: sB.cardCount }));
const passB = beforeB.cardCount > 0 && sB.cardCount === 0;
console.log('B RESULT      ', passB ? 'PASS' : 'FAIL(card stuck)');

// ---- E：会话切换后仍能正常显示高亮（签名跨会话污染回归） ----
await tab.evaluate(() => {
  localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 'sess-B' }));
  localStorage.setItem('dsh.annotation.pending.v1.sess-B', JSON.stringify([
    { id: 'q1', text: '只有当前这个对话的输出结果进行批注，才会异常，这是示例 1', note: '另一会话同名 id', seqKey: '7', textOffset: 40, focusAtEnd: true },
  ]));
});
await new Promise((r) => setTimeout(r, 1400));
const sE = await state();
console.log('E cross-sess  ', JSON.stringify({ hlTotal: sE.hlTotal, hlVisible: sE.hlVisible, chips: sE.chips.length }));
if (sE.chips.length > 0) {
  const cE = sE.chips[0];
  await tab.mouse.move(cE.x, cE.y);
  await new Promise((r) => setTimeout(r, 250));
  const sE2 = await state();
  console.log('E hover       ', JSON.stringify({ card: sE2.cardCount, hlVisible: sE2.hlVisible }));
  console.log('E RESULT      ', sE2.cardCount > 0 && sE2.hlVisible > 0 ? 'PASS' : 'FAIL');
}

await tab.evaluate(() => { document.getElementById('scroller').scrollTop = 0; });
console.log('SUMMARY       ', JSON.stringify({ A: passA, B: passB, C: passC, D: sD.cardCount === 0 }));
await browser.close();

