// 探针：在页面里挂一个全局计数器，观测 updateMarkerPositions 是否被调用、
// markerHover 是否有值、hoveredChip 是否命中。做法是把 client.js 源码注入后
// 用正则插桩（只在内存副本里改，不动源文件）。
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.SNC_PUPPETEER || 'puppeteer-core');
const SRC = 'C:/Users/52332/.dsh/profiles/desktop/node_modules/@changfenhuang/dsh-annotation/client.js';
let src = fs.readFileSync(SRC, 'utf8');

// 插桩 1：updateMarkerPositions 入口
src = src.replace(
  'function updateMarkerPositions() {\n        var placed = []',
  'function updateMarkerPositions() {\n        window.__probe.upd = (window.__probe.upd || 0) + 1\n        window.__probe.hoverAtEntry = markerHover === null ? null : markerHover.id\n        var placed = []'
);
// 插桩 2：hoveredChip 命中
src = src.replace(
  "if (hoveredId !== null && q.id === hoveredId) hoveredChip = { chip: chip, top: chipTop }",
  "if (hoveredId !== null && q.id === hoveredId) { hoveredChip = { chip: chip, top: chipTop }; window.__probe.hit = q.id }"
);
// 插桩 3：positionMarkerTip 调用
src = src.replace(
  'positionMarkerTip(card, hoveredChip.chip)',
  'window.__probe.pos = (window.__probe.pos || 0) + 1; positionMarkerTip(card, hoveredChip.chip)'
);
const hits = ['window.__probe.upd', 'window.__probe.hit', 'window.__probe.pos'].filter((k) => src.includes(k));
console.log('INSTRUMENTED   ', hits.length, '/3');

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
    <p>收到，这条补充了一个关键区别。</p>
    <p><strong>Annotation 2：只有当前这个对话的输出结果进行批注，才会异常，这是示例 2</strong></p>
    <p>同样收到，与 Annotation 1 一致。</p>
  </div>
  <div class="spacer"></div>
</div></div>
<div data-composer-card></div>
</body></html>`;

const QUOTES = [
  { id: 'q1', text: '只有当前这个对话的输出结果进行批注，才会异常，这是示例 1', note: '第一条批注', seqKey: '7', textOffset: 40, focusAtEnd: true },
  { id: 'q2', text: '只有当前这个对话的输出结果进行批注，才会异常，这是示例 2', note: '第二条批注', seqKey: '7', textOffset: 300, focusAtEnd: true },
];

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new', args: ['--no-sandbox'],
});
const tab = await browser.newPage();
await tab.setViewport({ width: 900, height: 700 });
await tab.setRequestInterception(true);
tab.on('request', (req) => {
  if (req.url().startsWith('http://ann.local/')) req.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: page });
  else req.continue();
});
await tab.goto('http://ann.local/');
await tab.evaluate(() => { window.__probe = {}; });
await tab.evaluate((quotes) => {
  localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 'sess-A' }));
  localStorage.setItem('dsh.annotation.pending.v1.sess-A', JSON.stringify(quotes));
}, QUOTES);
await tab.evaluate(() => { window.__ModuleLoader__ = { load: (m) => { window.__ANN = m; } }; });
await tab.evaluate(src);
await tab.evaluate(() => {
  const client = window.__ANN.factory(() => { throw Error('dep'); });
  const noop = () => () => {};
  client.apply({
    effect: (fn) => { fn(); },
    sessions: { get: () => null, on: noop },
    conversation: { on: noop },
    locale: { current: 'zh-CN', subscribe: noop },
  });
});
await new Promise((r) => setTimeout(r, 900));

const chip = await tab.evaluate(() => {
  const c = document.querySelector('[data-ann-chip-for="q1"]');
  const r = c.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
});
await tab.mouse.move(chip.x, chip.y);
await new Promise((r) => setTimeout(r, 300));

const pre = await tab.evaluate(() => ({ ...window.__probe, card: document.querySelector('[data-annotation-tip-layer]').children.length, cardTop: Math.round(document.querySelector('[data-annotation-tip-layer]').firstElementChild?.getBoundingClientRect().top ?? -999) }));
console.log('PRE-SCROLL     ', JSON.stringify(pre));

const post = await tab.evaluate(() => {
  const sc = document.getElementById('scroller');
  sc.scrollTop = 60;
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => {
    const layer = document.querySelector('[data-annotation-tip-layer]');
    const c = layer.firstElementChild;
    res({
      probe: { ...window.__probe },
      card: layer.children.length,
      cardTop: c ? Math.round(c.getBoundingClientRect().top) : null,
      chipTop: Math.round(document.querySelector('[data-ann-chip-for="q1"]').getBoundingClientRect().top),
      scrollTop: sc.scrollTop,
    });
  })));
});
console.log('POST-SCROLL    ', JSON.stringify(post));
await browser.close();
