// Compares how the group header may show "expanded" while the pointer is away.
// No permanent tint, tint, hairline, chevron-only, and an accent caption --
// each drawn at rest (pointer away) with the six rows below it, so the row can
// be judged against what it actually sits next to. Inline SVG + CSS only.
import fs from 'node:fs';

const W = 214;

const CAL = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 4.6 6 7.6 9 4.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEV = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4.6 3 7.6 6 4.6 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const COG = '<svg viewBox="0 0 14 14" fill="none" aria-hidden="true">'
  + '<circle cx="7" cy="7" r="2.3" stroke="currentColor" stroke-width="1.3"/>'
  + '<path d="M7 1.1v1.9M7 11v1.9M1.1 7h1.9M11 7h1.9M2.85 2.85 4.2 4.2M9.8 9.8l1.35 1.35M11.15 2.85 9.8 4.2M4.2 9.8 2.85 11.15" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
  + '</svg>';

const ROWS = ['插件', '自动化任务', '上下文洞察', '扩展管理', '任务看板', '记忆系统'];

/* one row is drawn as if hovered, so the comparison does not hide the fact that
   the SAME tint is used by the rows below -- that is the whole argument */
const rowsHtml = (hoverIndex = 0) => ROWS.map((n, i) =>
  `<div class="prow${i === hoverIndex ? ' is-hover' : ''}"><span class="pic">${CAL}</span>`
  + `<span class="ptxt">${n}</span></div>`).join('');

const header = (cls) => `
  <div class="hdr ${cls}">
    <span class="cap">扩展</span>
    <span class="act">${COG}</span>
    <span class="chev">${CHEV}</span>
  </div>`;

/* V0 -- today: the expanded row keeps the hover tint */
const V0 = `<div class="v0">${header('open tint')}<div class="plist">${rowsHtml(0)}</div></div>`;
/* V1 -- the fix: no tint at all; only the chevron speaks */
const V1 = `<div class="v1">${header('open')}<div class="plist">${rowsHtml(1)}</div></div>`;
/* V2 -- a hairline under the row, tying the header to its list */
const V2 = `<div class="v2">${header('open')}<div class="plist">${rowsHtml(2)}</div></div>`;
/* V3 -- caption picks up a touch of primary ink while expanded */
const V3 = `<div class="v3">${header('open lit')}<div class="plist">${rowsHtml(3)}</div></div>`;
/* V4 -- leaves on the caption, so the shape itself differs between states */
const V4 = `<div class="v4">${header('open leafy')}<div class="plist">${rowsHtml(4)}</div></div>`;

const panel = (tag, title, sub, body, note) => `
  <div class="cmp">
    <div class="cmpname"><b>${tag}</b>${title}</div>
    <div class="sub2">${sub}</div>
    ${body}
    <div class="note">${note}</div>
  </div>`;

const html = `<!doctype html><meta charset="utf-8">
<style>
:root{--ink:#0f1115;--ink2:#61666b;--ink3:#81858c;--quiet:#b3b8bf;--side:#f9fafb;--hover:#2631480f;--brand:#2b6cf6}
*{box-sizing:border-box}
body{margin:0;padding:18px;background:#eceef1;font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;color:var(--ink)}
.title{font-size:15px;font-weight:650;margin:0 0 4px 2px}
.sub{font-size:11.5px;color:var(--ink3);margin:0 0 14px 2px}
.grid{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}
.cmp{background:#fff;border-radius:12px;padding:12px;box-shadow:0 1px 6px #00000012}
.cmpname{font-size:12.5px;font-weight:600;color:var(--ink);margin:0 0 2px}
.cmpname b{display:inline-block;background:var(--ink);color:#fff;border-radius:5px;padding:0 5px;margin-right:5px;font-size:10.5px}
.sub2{font-size:11px;color:var(--ink3);margin:0 0 10px}
.note{font-size:11px;color:var(--ink3);line-height:1.6;margin-top:9px;max-width:${W}px}

.side{width:${W}px;background:var(--side);border-radius:10px;padding:8px 6px 10px}

.hdr{position:relative;display:flex;align-items:center;gap:0;min-height:36px;padding:7px 8px;margin:0 2px 2px;
  border-radius:12px;cursor:pointer;user-select:none;-webkit-user-select:none;box-sizing:border-box}
.hdr:hover{background:var(--hover)}
.cap{flex:1 1 auto;min-width:0;font-size:11px;font-weight:600;letter-spacing:.07em;line-height:16px;
  text-transform:uppercase;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.act,.chev{flex:none;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;
  border-radius:6px;color:var(--quiet);transition:all .12s ease}
.act svg,.chev svg{display:block;width:14px;height:14px}
/* at rest, pointer away: the gear is not shown (that is A2) */
.act{opacity:0}
.hdr:hover .act{opacity:1}

/* V0: the tint stays on while expanded -- what we are comparing against */
.v0 .hdr.tint{background:var(--hover)}

/* V2: a hairline that belongs to the header, not a full-width divider */
.v2 .hdr.open{border-bottom-left-radius:6px;border-bottom-right-radius:6px}
.v2 .hdr.open::after{content:"";position:absolute;left:8px;right:8px;bottom:0;height:1px;
  background:linear-gradient(90deg,#00000014,#00000008)}

/* V3: only the caption takes colour, and only a little */
.v3 .hdr.open.lit .cap{color:var(--ink2)}
.v3 .hdr.open.lit .chev{color:var(--ink2)}

/* V4: leaf count as a second, non-colour signal */
.v4 .hdr.open.leafy .cap::before{content:"";display:inline-block;width:5px;height:5px;border-radius:50%;
  background:var(--brand);opacity:.55;margin-right:6px;vertical-align:1px}

.plist{display:flex;flex-direction:column;gap:2px}
.prow{display:flex;align-items:center;gap:8px;min-height:36px;padding:0 8px;border-radius:12px;font-size:13.5px;cursor:pointer}
.prow.is-hover{background:var(--hover)}
.pic{flex:none;display:inline-flex;width:16px;height:16px;color:var(--ink2)}
.pic svg{display:block;width:16px;height:16px}
.ptxt{flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style>
<body>
  <div class="title">展开状态下，这一行该怎么表示「已展开」？</div>
  <div class="sub">全部是静止状态（鼠标不在上面）。每张图里有一条列表项被画成悬停态，方便对比同一个灰底在别处的含义。</div>
  <div class="grid">
    ${panel('现状', '常驻灰底', '展开就一直带底色', V0, '灰底在这套 UI 里是「悬停 / 选中」的语言。表头常驻灰底，会与下面真正被选中的那一行抢注意力。')}
    ${panel('V1', '完全不着色', '只靠箭头方向', V1, '最安静，也最接近 VS Code / Linear：表头是结构，不是状态。代价是「展开」这个信息只由 14px 的箭头承担。')}
    ${panel('V2', '底边一条细线', '表头属于自己的列表', V2, '细线把表头和一整组内容绑在一起，是分组语义而不是选中语义——它说的是「下面属于我」。')}
    ${panel('V3', '标签提亮一档', '只用文字深浅示意', V3, '从三级灰提到二级灰，幅度小到像光线变化。不引入新的形状或颜色。')}
    ${panel('V4', '加一颗小圆点', '颜色之外的第二信号', V4, '展开时标签前有一颗淡蓝点，收起即消失。不依赖颜色分辨，色盲用户也能看出来。')}
  </div>
</body>`;

const out = process.env.TEMP + '/a2-expanded.html';
fs.writeFileSync(out, html);
console.log('written', out, html.length);
