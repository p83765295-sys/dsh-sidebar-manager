// The shipping header after the fix: expanded (hairline, no fill), folded, and
// hovered. Drawn from the real tokens so the three states can be compared in
// one look. Inline SVG + CSS only.
import fs from 'node:fs';

const W = 214;

const CAL = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 4.6 6 7.6 9 4.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEV = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4.6 3 7.6 6 4.6 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const COG = '<svg viewBox="0 0 14 14" fill="none" aria-hidden="true">'
  + '<circle cx="7" cy="7" r="2.3" stroke="currentColor" stroke-width="1.3"/>'
  + '<path d="M7 1.1v1.9M7 11v1.9M1.1 7h1.9M11 7h1.9M2.85 2.85 4.2 4.2M9.8 9.8l1.35 1.35M11.15 2.85 9.8 4.2M4.2 9.8 2.85 11.15" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
  + '</svg>';

const ROWS = ['插件', '自动化任务', '上下文洞察', '扩展管理', '任务看板', '记忆系统'];
const rowsHtml = (hoverIndex = -1) => ROWS.map((n, i) =>
  `<div class="prow${i === hoverIndex ? ' is-hover' : ''}"><span class="pic">${CAL}</span>`
  + `<span class="ptxt">${n}</span></div>`).join('');

const header = (mods) => `
  <div class="hdr ${mods}">
    <span class="cap">扩展</span>
    <span class="act">${COG}</span>
    <span class="chev">${CHEV}</span>
  </div>`;

const panel = (tag, title, sub, body, note) => `
  <div class="cmp">
    <div class="cmpname"><b>${tag}</b>${title}</div>
    <div class="sub2">${sub}</div>
    ${body}
    <div class="note">${note}</div>
  </div>`;

const html = `<!doctype html><meta charset="utf-8">
<style>
:root{--ink:#0f1115;--ink2:#61666b;--ink3:#81858c;--quiet:#b3b8bf;--side:#f9fafb;--hover:#2631480f}
*{box-sizing:border-box}
body{margin:0;padding:18px;background:#eceef1;font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;color:var(--ink)}
.title{font-size:15px;font-weight:650;margin:0 0 4px 2px}
.sub{font-size:11.5px;color:var(--ink3);margin:0 0 14px 2px}
.grid{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}
.cmp{background:#fff;border-radius:12px;padding:12px;box-shadow:0 1px 6px #00000012}
.cmpname{font-size:12.5px;font-weight:600;margin:0 0 2px}
.cmpname b{display:inline-block;background:var(--ink);color:#fff;border-radius:5px;padding:0 5px;margin-right:5px;font-size:10.5px}
.sub2{font-size:11px;color:var(--ink3);margin:0 0 10px}
.note{font-size:11px;color:var(--ink3);line-height:1.6;margin-top:9px;max-width:${W}px}

.side{width:${W}px;background:var(--side);border-radius:10px;padding:8px 6px 10px}

.hdr{position:relative;display:flex;align-items:center;gap:0;min-height:36px;padding:7px 8px;margin:0 2px 2px;
  border-radius:12px;cursor:pointer;user-select:none;-webkit-user-select:none;box-sizing:border-box}
.cap{flex:1 1 auto;min-width:0;font-size:11px;font-weight:600;letter-spacing:.07em;line-height:16px;
  text-transform:uppercase;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.act,.chev{flex:none;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;
  border-radius:6px;color:var(--quiet);transition:all .12s ease}
.act svg,.chev svg{display:block;width:14px;height:14px}
.act{opacity:0}
.hdr:hover .act{opacity:1}

/* expanded: the hairline, no fill */
.hdr.open{
  background-image:linear-gradient(90deg,rgba(0,0,0,.075),rgba(0,0,0,.03));
  background-repeat:no-repeat;
  background-size:calc(100% - 16px) 1px;
  background-position:8px 100%;
}
/* hover: colour only, so the hairline stays */
.hdr.open:hover{background-color:var(--hover)}
.hdr.folded .chev{transform:rotate(-90deg)}
/* folded: the gear stays visible */
.hdr.folded .act{opacity:1}

.plist{display:flex;flex-direction:column;gap:2px}
.prow{display:flex;align-items:center;gap:8px;min-height:36px;padding:0 8px;border-radius:12px;font-size:13.5px;cursor:pointer}
.prow.is-hover{background:var(--hover)}
.pic{flex:none;display:inline-flex;width:16px;height:16px;color:var(--ink2)}
.pic svg{display:block;width:16px;height:16px}
.ptxt{flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style>
<body>
  <div class="title">改完之后：展开的头只多一条细线</div>
  <div class="sub">三种状态并排。列表里那一条灰底是悬停态，用来说明「灰底 = 悬停」，表头平时不占用这个颜色。</div>
  <div class="grid">
    ${panel('展开', '细线在头底下', '鼠标不在上面', `<div class="side">${header('open')}<div class="plist">${rowsHtml(0)}</div></div>`, '细线只有 1px、两端各缩进 8px，不会和下面列表项的灰底撞语义。')}
    ${panel('悬停', '底色 + 细线共存', '鼠标在表头上', `<div class="side">${header('open hov')}<div class="plist">${rowsHtml(1)}</div></div>`, '悬停只加背景色，细线是独立的一层背景图，两者叠加不打架。')}
    ${panel('折叠', '细线自动消失', '列表收起', `<div class="side">${header('folded')}</div>`, '收起后没有内容可“归属”，细线随状态消失，只剩一行头和常驻齿轮。')}
  </div>
</body>`;

const out = process.env.TEMP + '/a2-final.html';
fs.writeFileSync(out, html);
console.log('written', out, html.length);
