// 诊断：被批注文本落在 genui 渲染块内/跨越块边界时，quoteRects 得到什么样的矩形。
// 目标是把「悬停无高亮 / 卡片不消失 / 不跟随」归因到具体的 DOM 结构差异。
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.SNC_PUPPETEER || 'puppeteer-core');
const SRC = 'C:/Users/52332/.dsh/profiles/desktop/node_modules/@changfenhuang/dsh-annotation/client.js';
const src = fs.readFileSync(SRC, 'utf8');

// 结构模拟宿主消息行：普通 markdown 段 + 一个 genui 渲染块。
// genui 块内部是表格（单元格各自独立文本节点），正是用户批注的地方。
const page = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#fff;font-family:system-ui;font-size:14px}
#scroller{height:100%;overflow-y:auto}
#flow{padding:20px 24px;max-width:760px;line-height:1.75}
p{margin:0 0 12px}
.genui-card{margin:12px 0;border:1px solid #e4e4e7;border-radius:12px;padding:12px;background:#fafafa}
table{border-collapse:collapse;width:100%}
td,th{border:1px solid #ddd;padding:6px 8px;font-size:13px;vertical-align:top}
.spacer{height:1200px}
[data-composer-card]{position:fixed;left:20px;right:20px;bottom:10px;height:90px;background:#fff;border:1px solid #ddd;border-radius:12px}
</style></head><body>
<div id="scroller"><div data-chat-flow-kind="assistant-step" id="flow">

  <p id="plain">先按你的要求逐条回应两条批注，这两条内容相同，我把它们并成一条讲，不重复。</p>

  <div class="genui-card" data-genui-block="1">
    <p id="g-para">关键约束已经清楚：只有再确认一下当前侧栏面板行视图标签运行逻辑是统一的吗这条特定输出才会触发。</p>
    <table>
      <tr><th>症状</th><th>机制</th></tr>
      <tr><td id="g-cell">悬浮窗不跟随滚动，markersSignature 不含坐标</td><td>x</td></tr>
      <tr><td id="g-cell2">两个存储键合并成带版本号的单一对象以便未来迁移</td><td>y</td></tr>
    </table>
  </div>

  <p id="tail">这条是 genui 块之后的普通纯文本段落，用作对照。</p>

  <div class="spacer"></div>
</div></div>
<div data-composer-card></div>
</body></html>`;

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

// 三种批注：纯文本段 / genui 表格单元格内 / 跨越 genui 块边界
const cases = [
  { name: 'A 纯文本段', el: '#plain', text: '这两条内容相同' },
  { name: 'B genui 单元格内', el: '#g-cell', text: '悬浮窗不跟随滚动' },
  { name: 'C 跨块边界', el: '#g-para', text: '关键约束已经清楚' },
];

const results = await tab.evaluate((cases) => {
  const out = [];
  for (const c of cases) {
    const host = document.querySelector(c.el);
    // 模拟 rangeFromOffset：在宿主元素里按文本节点拼出偏移
    const nodes = [];
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode()) !== null) nodes.push(n);
    let full = '';
    const map = [];
    nodes.forEach((node, i) => { map.push({ i, start: full.length, len: (node.nodeValue || '').length }); full += node.nodeValue || ''; });
    const at = full.indexOf(c.text);
    let range = null;
    if (at >= 0) {
      let si = 0, so = at;
      for (const m of map) { if (at < m.start + m.len) { si = m.i; so = at - m.start; break; } }
      range = document.createRange();
      range.setStart(nodes[si], so);
      let remain = c.text.length, j = si, inner = so;
      while (remain > 0 && j < nodes.length) {
        const l = (nodes[j].nodeValue || '').length;
        const take = Math.min(remain, l - inner);
        remain -= take;
        if (remain === 0) { range.setEnd(nodes[j], inner + take); break; }
        j++; inner = 0;
      }
    }
    const rects = range ? Array.from(range.getClientRects()) : [];
    out.push({
      name: c.name,
      found: at >= 0,
      nodeCount: nodes.length,
      rectCount: rects.length,
      rects: rects.map((r) => ({ w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left) })),
      zeroRects: rects.filter((r) => r.width === 0 || r.height === 0).length,
      rangeText: range ? JSON.stringify(range.toString()) : null,
      matchOk: range ? range.toString() === c.text : false,
      // 关键：Range 是否跨出了宿主元素
      escaped: range ? !host.contains(range.commonAncestorContainer) : null,
      commonAncestor: range ? (range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer.tagName + '.' + (range.commonAncestorContainer.className || '') : 'TEXT') : null,
    });
  }
  return out;
}, cases);

for (const r of results) console.log(JSON.stringify(r));
await browser.close();
