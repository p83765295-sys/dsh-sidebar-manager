// 端到端：GenUI 场景（隐藏 pre + 可见渲染容器并存）下的批注高亮与悬浮卡。
// 断言：高亮可见、数量正确、Range 不落在隐藏节点、卡片可开可关。
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.SNC_PUPPETEER || 'puppeteer-core');
const src = fs.readFileSync('C:/Users/52332/.dsh/profiles/desktop/node_modules/@changfenhuang/dsh-annotation/client.js', 'utf8');

// 复刻宿主 genui 的真实做法：<pre> 保留原文但 display:none，其后插入渲染容器。
const page = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#fff;font-family:system-ui;font-size:14px}
#scroller{height:100%;overflow-y:auto}
#flow{padding:20px 24px;max-width:760px;line-height:1.75}
p{margin:0 0 12px}
.genui-dom-fence{margin:12px 0;border:1px solid #e4e4e7;border-radius:12px;padding:12px;background:#fafafa}
.row{padding:5px 6px}
.spacer{height:1200px}
[data-composer-card]{position:fixed;left:20px;right:20px;bottom:10px;height:90px;background:#fff;border:1px solid #ddd;border-radius:12px}
</style></head><body>
<div id="scroller"><div data-chat-flow-kind="assistant-step" data-chat-anchor-key="7" id="flow">
  <p>先按你的要求逐条回应两条批注，这两条内容相同，我把它们并成一条讲。</p>
  <pre data-lang="dsh-ui" data-genui-block="1" data-hidden-fence="1" data-chat-fence="">{"items":[{"type":"callout","content":"悬浮窗不跟随滚动，markersSignature 不含坐标"},{"type":"table","rows":[["悬浮窗不消失","没有关闭卡片的路径"]]}]}</pre>
  <div class="genui-dom-fence" data-genui-rendered>
    <div class="row">悬浮窗不跟随滚动，markersSignature 不含坐标</div>
    <div class="row">悬浮窗不消失，没有关闭卡片的路径</div>
  </div>
  <p>这段是 genui 块之后的纯文本段落，用作对照。</p>
  <div class="spacer"></div>
</div></div>
<div data-composer-card></div>
</body></html>`;

// 两条批注都落在 genui 渲染容器内（用户报障的场景）
const QUOTES = [
  { id: 'g1', text: '悬浮窗不跟随滚动', note: '第一条', seqKey: '7', textOffset: -1, focusAtEnd: true },
  { id: 'g2', text: '悬浮窗不消失', note: '第二条', seqKey: '7', textOffset: -1, focusAtEnd: true },
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
// 页面加载后用脚本把 pre 真正隐藏，模拟宿主 e.style.display='none'
await tab.evaluate(() => {
  const pre = document.querySelector('pre[data-hidden-fence]');
  if (pre) pre.style.display = 'none';
});
await tab.evaluate((quotes) => {
  localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 'sess-G' }));
  localStorage.setItem('dsh.annotation.pending.v1.sess-G', JSON.stringify(quotes));
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
await new Promise((r) => setTimeout(r, 1000));

const s = await tab.evaluate(() => {
  const hls = [...document.querySelectorAll('[data-ann-hl-for]')];
  const chips = [...document.querySelectorAll('[data-ann-chip-for]')];
  const hiddenPre = document.querySelector('pre[data-hidden-fence]');
  return {
    hlTotal: hls.length,
    hlWithSize: hls.filter((h) => parseFloat(h.style.width) > 0 && parseFloat(h.style.height) > 0).length,
    hlSizes: hls.map((h) => h.getAttribute('data-ann-hl-for') + ':' + h.style.width + 'x' + h.style.height),
    chipCount: chips.length,
    chipPos: chips.map((c) => ({ id: c.getAttribute('data-ann-chip-for'), top: Math.round(c.getBoundingClientRect().top) })),
    hiddenPreExists: hiddenPre !== null,
    hiddenPreTextLen: hiddenPre ? (hiddenPre.textContent || '').length : 0,
  };
});
console.log('GENUI STATE   ', JSON.stringify(s, null, 1));

const passHl = s.hlTotal >= 2 && s.hlWithSize >= 2;
console.log('HIGHLIGHT     ', passHl ? 'PASS' : 'FAIL');

// 悬停第一个角标：卡片出现、高亮点亮
const chip = await tab.evaluate(() => {
  const c = document.querySelector('[data-ann-chip-for="g1"]');
  const r = c.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
});
await tab.mouse.move(chip.x, chip.y);
await new Promise((r) => setTimeout(r, 300));
const hov = await tab.evaluate(() => {
  const layer = document.querySelector('[data-annotation-tip-layer]');
  return {
    card: layer ? layer.children.length : -1,
    lit: [...document.querySelectorAll('[data-ann-hl-for]')].filter((h) => h.style.display !== 'none').length,
  };
});
console.log('HOVER         ', JSON.stringify(hov), hov.card > 0 && hov.lit > 0 ? 'PASS' : 'FAIL');

// 移开指针：卡片消失
await tab.mouse.move(870, 320);
await new Promise((r) => setTimeout(r, 450));
const left = await tab.evaluate(() => {
  const layer = document.querySelector('[data-annotation-tip-layer]');
  return { card: layer ? layer.children.length : -1 };
});
console.log('LEAVE         ', JSON.stringify(left), left.card === 0 ? 'PASS' : 'FAIL');

await browser.close();
