// The header at the host's own type scale, next to a faithful copy of the
// native sidebar chrome (14px / 22px rows, 12px newSession, 11-14px icons), so
// "does this look like it was made by DSH" can be judged rather than guessed.
import fs from 'node:fs';

const W = 214;

const ICON = (d) => `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">${d}</svg>`;
const CAL = ICON('<path d="M3.2 4.4 6 7.2l2.8-2.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>');
const PLUS = ICON('<path d="M8 3.4v9.2M3.4 8h9.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>');
const CHEV = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4.6 3 7.6 6 4.6 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const COG = '<svg viewBox="0 0 14 14" fill="none" aria-hidden="true">'
  + '<circle cx="7" cy="7" r="2.3" stroke="currentColor" stroke-width="1.3"/>'
  + '<path d="M7 1.1v1.9M7 11v1.9M1.1 7h1.9M11 7h1.9M2.85 2.85 4.2 4.2M9.8 9.8l1.35 1.35M11.15 2.85 9.8 4.2M4.2 9.8 2.85 11.15" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
  + '</svg>';

const ROWS = ['插件', '自动化任务', '上下文洞察', '扩展管理', '任务看板', '记忆系统'];
/* native panelRow: min-height 36, padding 7px 8px, gap 8, line-height 22, 14px */
const rowsHtml = () => ROWS.map((n) =>
  `<div class="prow"><span class="pic">${CAL}</span><span class="ptxt">${n}</span></div>`).join('');

/* the native newSession button: 12px label, 22px line box inside a 36px row */
const newSession = `
  <div class="ns"><span class="nsic">${PLUS}</span><span class="nstxt">新会话</span></div>`;

const header = (mods) => `
  <div class="hdr ${mods}">
    <span class="cap">扩展</span>
    <span class="act">${COG}</span>
    <span class="chev">${CHEV}</span>
  </div>`;

const side = (inner) => `<div class="side">${newSession}${inner}</div>`;

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
body{margin:0;padding:18px;background:#eceef1;font-family:var(--dsw-font-family,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif);color:var(--ink)}
.title{font-size:15px;font-weight:650;margin:0 0 4px 2px}
.sub{font-size:11.5px;color:var(--ink3);margin:0 0 14px 2px}
.grid{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}
.cmp{background:#fff;border-radius:12px;padding:12px;box-shadow:0 1px 6px #00000012}
.cmpname{font-size:12.5px;font-weight:600;margin:0 0 2px}
.cmpname b{display:inline-block;background:var(--ink);color:#fff;border-radius:5px;padding:0 5px;margin-right:5px;font-size:10.5px}
.sub2{font-size:11px;color:var(--ink3);margin:0 0 10px}
.note{font-size:11px;color:var(--ink3);line-height:1.6;margin-top:9px;max-width:${W}px}

.side{width:${W}px;background:var(--side);border-radius:10px;padding:8px 6px 10px}

/* native newSession, so the header has something real to sit under */
.ns{display:flex;align-items:center;gap:6px;min-height:36px;padding:7px 8px;margin:0 2px 8px;
  border-radius:12px;font-size:12px;cursor:pointer}
.ns:hover{background:var(--hover)}
.nsic{flex:none;display:inline-flex;width:16px;height:16px;color:var(--ink2)}
.nsic svg{display:block;width:16px;height:16px}
.nstxt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* ---- the shipping header: 500 / 14px / 22px, label-secondary ---- */
.hdr{position:relative;display:flex;align-items:center;gap:0;min-height:36px;padding:7px 8px;margin:0 2px 4px;
  border-radius:12px;cursor:pointer;user-select:none;-webkit-user-select:none;box-sizing:border-box}
.hdr:hover{background:var(--hover)}
.cap{flex:1 1 auto;min-width:0;
  font-family:var(--dsw-font-family,inherit);
  font-size:14px;font-weight:500;line-height:22px;
  color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.act,.chev{flex:none;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;
  border-radius:6px;color:var(--quiet);transition:all .12s ease}
.act svg,.chev svg{display:block;width:14px;height:14px}
.act{opacity:0}
.hdr:hover .act{opacity:1}
.hdr.folded .act{opacity:1}
.hdr.folded .chev{transform:rotate(-90deg)}

.plist{display:flex;flex-direction:column;gap:4px}
.prow{display:flex;align-items:center;gap:8px;min-height:36px;padding:7px 8px;margin:0 2px;border-radius:12px;
  font-size:14px;line-height:22px;cursor:pointer}
.prow:hover{background:var(--hover)}
.pic{flex:none;display:inline-flex;width:16px;height:16px;color:var(--ink2)}
.pic svg{display:block;width:16px;height:16px}
.ptxt{flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style>
<body>
  <div class="title">字号对齐到 DSH 原生：500 / 14px / 22px</div>
  <div class="sub">上面是原生「新会话」，下面六行是原生面板行（14px/22px）。表头现在与列表同行高、同字号，只是颜色浅一档、字重同为 500。</div>
  <div class="grid">
    ${panel('展开', '无底色、无细线', '指针不在上面', side(header('open') + `<div class="plist">${rowsHtml()}</div>`), '表头与「插件」等行完全同一行高（36px）与字号（14px），视觉上自然成为一组。')}
    ${panel('悬停', '齿轮浮出', '指针在表头上', side(header('open hov') + `<div class="plist">${rowsHtml()}</div>`), '悬停仍然只有一层底色，和列表项完全一致。')}
    ${panel('折叠', '只剩一行头', '列表收起', side(header('folded')), '收起后表头与「新会话」并肩，字号一致不跳档。')}
  </div>
</body>`;

const out = process.env.TEMP + '/a2-type.html';
fs.writeFileSync(out, html);
console.log('written', out, html.length);
