// 验证 GenUI 场景的核心缺陷：同一个代码块在 DOM 里存在两份文本
//   (1) display:none 的原始 <pre>（保留 markdown 原文）
//   (2) 渲染出的可见容器（真实组件 DOM）
// 直接照宿主实现复刻：genui 把 pre 隐藏、在 pre.after() 插入渲染容器。
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.SNC_PUPPETEER || 'puppeteer-core');
const src = fs.readFileSync('C:/Users/52332/.dsh/profiles/desktop/node_modules/@changfenhuang/dsh-annotation/client.js', 'utf8');

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#fff;font-family:system-ui;font-size:14px}
#scroller{height:100%;overflow-y:auto}
#flow{padding:20px 24px;max-width:760px;line-height:1.75}
p{margin:0 0 12px}
pre{margin:12px 0;padding:12px;background:#f4f4f5;border-radius:10px;font-size:13px;white-space:pre-wrap}
.genui-dom-fence{margin:12px 0;border:1px solid #e4e4e7;border-radius:12px;padding:12px;background:#fafafa}
.genui-card-row{padding:6px 8px;border-bottom:1px solid #eee}
.spacer{height:1200px}
[data-composer-card]{position:fixed;left:20px;right:20px;bottom:10px;height:90px;background:#fff;border:1px solid #ddd;border-radius:12px}
</style></head><body>
<div id="scroller"><div data-chat-flow-kind="assistant-step" id="flow">

  <p>先按你的要求逐条回应两条批注。</p>

  <pre id="fence1" data-lang="dsh-ui">{"title":"三条症状的根因","items":[
  {"type":"callout","tone":"error","title":"核心矛盾","content":"genui 块内部文本与原文完全脱节"},
  {"type":"table","columns":["症状","根因"],"rows":[["不跟随滚动","updateMarkerPositions 只挪高亮和角标"],["不消失","没有关闭卡片的路径"]]}
]}</pre>

  <div class="genui-dom-fence" data-genui-rendered id="rendered1">
    <div class="genui-card-row">三条症状的根因</div>
    <div class="genui-card-row">核心矛盾：genui 块内部文本与原文完全脱节</div>
    <div class="genui-card-row">不跟随滚动 — updateMarkerPositions 只挪高亮和角标</div>
  </div>

  <p id="tail">这段是 genui 块之后的纯文本段落，用作对照。</p>
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

const diag = await tab.evaluate(() => {
  const flow = document.getElementById('flow');
  const out = {};
  // 1) textContent 里隐藏 pre 的原文是否计入
  const full = flow.textContent || '';
  out.hiddenPreTextIncluded = full.includes('三条症状的根因') && full.includes('不跟随滚动');
  out.hiddenPreCount = flow.querySelectorAll('pre').length;
  out.renderedCount = flow.querySelectorAll('[data-genui-rendered]').length;
  // 2) 隐藏 pre 的矩形
  const pre = document.getElementById('fence1');
  const pr = pre.getBoundingClientRect();
  out.hiddenPreRect = { w: Math.round(pr.width), h: Math.round(pr.height), display: getComputedStyle(pre).display };
  // 3) 若 Range 落在隐藏 pre 内，getClientRects 返回什么
  const textNode = pre.querySelector('p, pre') || pre;
  let walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
  const tn = walker.nextNode();
  if (tn) {
    const r = document.createRange();
    r.setStart(tn, 0); r.setEnd(tn, Math.min(6, tn.nodeValue.length));
    out.rangeOnHiddenPre_rects = Array.from(r.getClientRects()).length;
    out.rangeOnHiddenPre_text = JSON.stringify(r.toString());
  }
  // 4) 可见渲染容器里 Range 是否正常
  const rendered = document.getElementById('rendered1');
  walker = document.createTreeWalker(rendered, NodeFilter.SHOW_TEXT);
  const rn = walker.nextNode();
  if (rn) {
    const r2 = document.createRange();
    r2.setStart(rn, 0); r2.setEnd(rn, Math.min(6, rn.nodeValue.length));
    const rects = Array.from(r2.getClientRects());
    out.rangeOnRendered_rects = rects.length;
    out.rangeOnRendered_size = rects[0] ? { w: Math.round(rects[0].width), h: Math.round(rects[0].height) } : null;
  }
  // 5) 关键：模拟插件旧版 rangeFromOffset（不过滤隐藏）会落到哪
  function oldRangeFromOffset(el, offset, length) {
    const nodes = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode()) !== null) nodes.push(n);
    let pos = 0;
    for (let i = 0; i < nodes.length; i++) {
      const len = (nodes[i].nodeValue || '').length;
      if (offset < pos + len) {
        const range = document.createRange();
        range.setStart(nodes[i], offset - pos);
        let remain = length, j = i, inner = offset - pos;
        while (remain > 0 && j < nodes.length) {
          const l = (nodes[j].nodeValue || '').length;
          const take = Math.min(remain, l - inner);
          remain -= take;
          if (remain === 0) { range.setEnd(nodes[j], inner + take); break; }
          j++; inner = 0;
        }
        return range;
      }
      pos += len;
    }
    return null;
  }
  // 在 flow 里找「不跟随滚动」的偏移（它在隐藏 pre 里）
  const at = full.indexOf('不跟随滚动');
  out.offsetOfQuoted = at;
  if (at >= 0) {
    const r = oldRangeFromOffset(flow, at, '不跟随滚动'.length);
    if (r) {
      const rects = Array.from(r.getClientRects());
      out.oldApproach = {
        rectCount: rects.length,
        zeroSized: rects.filter((x) => x.width === 0 || x.height === 0).length,
        inHiddenPre: pre.contains(r.commonAncestorContainer),
        text: JSON.stringify(r.toString()),
      };
    }
  }
  return out;
});

console.log(JSON.stringify(diag, null, 1));
await browser.close();
