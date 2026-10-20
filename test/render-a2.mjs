// Renders the SHIPPING A2 header (gear appears only on hover) as a mock page:
// expanded, hovered, folded, plus the edit mode rows, so the row can be judged
// in situ against a native-looking sidebar. Inline SVG + CSS only.
import fs from 'node:fs';

const W = 214;

const CAL = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 4.6 6 7.6 9 4.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEV = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4.6 3 7.6 6 4.6 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const COG = '<svg viewBox="0 0 14 14" fill="none" aria-hidden="true">'
  + '<circle cx="7" cy="7" r="2.3" stroke="currentColor" stroke-width="1.3"/>'
  + '<path d="M7 1.1v1.9M7 11v1.9M1.1 7h1.9M11 7h1.9M2.85 2.85 4.2 4.2M9.8 9.8l1.35 1.35M11.15 2.85 9.8 4.2M4.2 9.8 2.85 11.15" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
  + '</svg>';
const CHECK = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.6 6.3 5 8.7 9.4 3.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const GRIP = '<svg viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">'
  + '<circle cx="3" cy="3.5" r="1.1"/><circle cx="7" cy="3.5" r="1.1"/>'
  + '<circle cx="3" cy="8" r="1.1"/><circle cx="7" cy="8" r="1.1"/>'
  + '<circle cx="3" cy="12.5" r="1.1"/><circle cx="7" cy="12.5" r="1.1"/></svg>';

const ROWS = ['插件', '自动化任务', '上下文洞察', '扩展管理', '任务看板', '记忆系统'];

const rowsHtml = () => ROWS.map((n) =>
  `<div class="prow"><span class="pic">${CAL}</span><span class="ptxt">${n}</span></div>`).join('');

/* one extension row in edit mode: grip + checkbox + the host row itself */
const editRowsHtml = () => ROWS.map((n, i) =>
  `<div class="erow${i === 3 ? ' off' : ''}"><span class="grip">${GRIP}</span>`
  + `<span class="box${i === 3 ? '' : ' on'}">${i === 3 ? '' : CHECK}</span>`
  + `<span class="pic">${CAL}</span><span class="ptxt">${n}</span></div>`).join('');

/* the header: caption takes the free width, gear + chevron at the trailing edge.
   `hover` marks the row as if the pointer were over it. */
const header = ({ folded, hover, editing }) => `
  <div class="hdr${folded ? ' is-folded' : ''}${hover ? ' is-hover' : ''}${editing ? ' is-editing' : ''}">
    <span class="cap">扩展</span>
    <span class="act${editing ? ' is-on' : ''}">${editing ? COG.replace('M7 1.1v1.9M7 11v1.9', 'M7 1.1v1.9M7 11v1.9') : COG}</span>
    <span class="chev">${CHEV}</span>
  </div>`;

const side = (inner) => `<div class="side">${inner}</div>`;

const panel = (title, sub, body) => `
  <div class="cmp">
    <div class="cmpname"><b>${title}</b>${sub}</div>
    ${body}
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
.cmpname{font-size:12px;color:var(--ink2);margin:0 0 10px;line-height:1.5}
.cmpname b{display:inline-block;background:var(--ink);color:#fff;border-radius:5px;padding:0 5px;margin-right:5px;font-size:10.5px}
.note{font-size:11px;color:var(--ink3);line-height:1.6;margin-top:9px;max-width:${W}px}

.side{width:${W}px;background:var(--side);border-radius:10px;padding:8px 6px 10px}

/* ---- the A2 header ---- */
.hdr{position:relative;display:flex;align-items:center;gap:0;height:30px;padding:7px 8px;margin:0 2px 2px;
  border-radius:12px;cursor:pointer;user-select:none;-webkit-user-select:none;transition:background .12s ease;
  box-sizing:content-box}
.hdr.is-hover,.hdr:hover{background:var(--hover)}
.cap{flex:1 1 auto;min-width:0;font-size:11px;font-weight:600;letter-spacing:.07em;line-height:16px;
  text-transform:uppercase;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.act,.chev{flex:none;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;
  border-radius:6px;color:var(--quiet);transition:color .12s ease,background .12s ease,opacity .12s ease,transform .15s ease}
.act svg,.chev svg{display:block;width:14px;height:14px}
/* A2: the gear is not there until the row is approached */
.act{opacity:0}
.hdr.is-hover .act,.hdr:hover .act,.hdr.is-editing .act{opacity:1}
.act.is-on{opacity:1;color:var(--brand)}
.hdr.is-hover .chev,.hdr:hover .chev{color:var(--ink2)}
.hdr.is-folded .chev{transform:rotate(-90deg)}
/* the dirty dot: unsaved display changes */
.act.is-on::after{content:"";position:absolute;width:4px;height:4px;border-radius:50%;background:var(--brand);
  transform:translate(6px,-6px)}

/* ---- extension rows ---- */
.plist{display:flex;flex-direction:column;gap:2px}
.prow,.erow{display:flex;align-items:center;gap:8px;height:36px;padding:0 8px;border-radius:12px;font-size:13.5px;cursor:pointer}
.prow:hover,.erow:hover{background:var(--hover)}
.pic{flex:none;display:inline-flex;width:16px;height:16px;color:var(--ink2)}
.pic svg{display:block;width:16px;height:16px}
.ptxt{flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.grip{flex:none;display:inline-flex;width:10px;height:16px;color:#c9ced5;cursor:grab}
.grip svg{display:block;width:10px;height:16px}
.box{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;
  border-radius:4px;border:1.5px solid #cbd0d7;color:#fff}
.box.on{background:var(--ink);border-color:var(--ink)}
.box svg{display:block;width:12px;height:12px}
.erow.off{opacity:.42}
</style>
<body>
  <div class="title">A2 · 齿轮悬停才出现</div>
  <div class="sub">展开时看不到齿轮，鼠标移上去才浮出；折叠后齿轮常驻（不然折叠态就再也找不到它了）</div>
  <div class="grid">
    ${panel('静止', '未悬停：只有标签和箭头', side(header({ folded: false }) + `<div class="plist">${rowsHtml()}</div>`) + `<div class="note">干净到几乎没有存在感——这正是悬停设计的目的。</div>`)}
    ${panel('悬停', '鼠标移入：齿轮淡入', side(header({ folded: false, hover: true }) + `<div class="plist">${rowsHtml()}</div>`) + `<div class="note">齿轮出现在箭头左边，两个 20px 目标之间有间距。</div>`)}
    ${panel('折叠态', '齿轮常驻，箭头转向下', side(header({ folded: true, hover: true })) + `<div class="note">列表收起后齿轮仍然可见，否则它随列表一起消失就再也点不到了。</div>`)}
    ${panel('编辑态', '勾选框 + 拖拽把手', side(header({ folded: false, editing: true }) + `<div class="plist">${editRowsHtml()}</div>`) + `<div class="note">齿轮亮起表示正在编辑；已隐藏项变淡但仍可见，方便勾回来。</div>`)}
  </div>
</body>`;

const out = process.env.TEMP + '/a2-hover.html';
fs.writeFileSync(out, html);
console.log('written', out, html.length);
