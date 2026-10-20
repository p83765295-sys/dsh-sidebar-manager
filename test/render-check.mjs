/* Real-DOM render check for dsh-sidebar-nav-collapse.
   Boots the real client bundle inside Chromium against a faithful replica of the
   host sidebar markup + theme tokens, then screenshots each interaction state. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const puppeteer = require_(process.env.SNC_SHOT_DIR + '/node_modules/puppeteer-core');

const SRC = process.argv[2] || 'C:/Users/52332/.dsh/_localsrc/dsh-sidebar-nav-collapse';
const OUT = process.argv[3] || 'C:/Users/52332/.dsh/_localsrc/dsh-sidebar-nav-collapse/shots';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
fs.mkdirSync(OUT, { recursive: true });

const P = '_2H3hWW';
const items = [
  ['插件', 'M7 2h2v3H7zM2 7h3v2H2zM11 7h3v2h-3zM7 11h2v3H7z'],
  ['自动化任务', 'M2 3h12v2H2zM2 7h12v2H2zM2 11h8v2H2z'],
  ['上下文洞察', 'M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z'],
  ['扩展管理', 'M2 4h12v2H2zM4 8h8v2H4zM6 12h4v2H6z'],
  ['任务看板', 'M2 2h3v12H2zM6.5 2h3v8h-3zM11 2h3v10h-3z'],
  ['记忆系统', 'M8 1a3 3 0 0 1 3 3v1a3 3 0 0 1-1 5.8V13H6v-2.2A3 3 0 0 1 5 5V4a3 3 0 0 1 3-3z'],
];
const icon = (d) => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="${d}"/></svg>`;
const row = ([name, d]) =>
  `<button class="${P}_panelRow" aria-label="${name}" title="${name}"><span class="${P}_panelGlyph">${icon(d)}</span><span class="${P}_panelTitle">${name}</span></button>`;

const page = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
  :root{
    --dsw-alias-label-primary:#1b1f24; --dsw-alias-label-secondary:#5b6470;
    --dsw-radius-md:12px; --dsw-radius-sm:8px;
    --dsw-alias-bg-secondary:rgba(20,30,50,.05); --dsw-alias-bg-tertiary:rgba(20,30,50,.08);
    --dsw-alias-bg-hover:rgba(20,30,50,.07); --dsw-alias-separator:rgba(20,30,50,.10);
  }
  body{margin:0;background:#f4f6fa;font:13px/1.4 system-ui,"Segoe UI","Microsoft YaHei",sans-serif;color:var(--dsw-alias-label-primary)}
  .side{width:250px;padding:10px 12px;background:#fff;height:100vh;box-sizing:border-box;border-right:1px solid var(--dsw-alias-separator)}
  nav.${P}_panelList{display:flex;flex-direction:column;gap:2px;overflow:hidden}
  .${P}_panelRow{display:flex;align-items:center;gap:8px;min-height:36px;padding:7px 8px;border:0;background:transparent;
    border-radius:var(--dsw-radius-md,12px);font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;width:100%}
  .${P}_panelRow:hover{background:var(--dsw-alias-bg-hover)}
  .${P}_panelGlyph{display:flex;width:16px;height:16px;color:var(--dsw-alias-label-secondary)}
  .${P}_panelTitle{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #workspaces{margin-top:12px;padding:10px 8px;border-top:1px solid var(--dsw-alias-separator);color:var(--dsw-alias-label-secondary)}
  .section-label{margin:10px 8px 4px;font-size:11px;letter-spacing:.06em;color:var(--dsw-alias-label-secondary)}
</style></head><body><div class="side">
  <div class="section-label">会话</div>
  <div id="workspaces">Workspace and sessions</div>
  <div class="section-label">全局面板</div>
  <nav class="${P}_panelList" aria-label="全局面板">${items.map(row).join('')}</nav>
</div></body></html>`;

const bundle = fs.readFileSync(path.join(SRC, 'lib/client.js'), 'utf8');

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
const tab = await browser.newPage();
await tab.setViewport({ width: 250, height: 460, deviceScaleFactor: 2 });
/* a file:// document has no storage; serve the page from a real origin instead */
await tab.setRequestInterception(true);
tab.on('request', (req) => {
  if (req.isNavigationRequest() && req.frame() === tab.mainFrame()) {
    return req.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: page });
  }
  return req.continue();
});
await tab.goto('http://snc.local/', { waitUntil: 'load' });
await tab.evaluate(() => { window.__ModuleLoader__ = { load: (m) => { window.__SNC = m; } }; });
await tab.evaluate(bundle);
const applied = await tab.evaluate(() => {
  const m = window.__SNC;
  if (!m) return 'no module';
  const client = m.factory(() => { throw Error('unexpected dep'); });
  const apply = client?.apply || m?.apply;
  if (typeof apply !== 'function') return 'no apply';
  apply({ effect: (fn) => fn() });
  return 'ok';
});
if (applied !== 'ok') throw new Error('bundle did not apply: ' + applied);
await new Promise((r) => setTimeout(r, 150));

const shell = (s) => `document.querySelector('.snc-shell').dataset.snc${s}`;
const shot = async (name) => { await new Promise((r) => setTimeout(r, 120)); await tab.screenshot({ path: path.join(OUT, name) }); };

/* 1. expanded */
await shot('1-expanded.png');
const geom = await tab.evaluate(() => {
  const g = document.querySelector('.snc-group').getBoundingClientRect();
  const gear = document.querySelector('.snc-gear').getBoundingClientRect();
  const first = document.querySelector('nav button').getBoundingClientRect();
  return {
    group: { top: g.top, height: g.height, left: g.left, right: g.right },
    gear: { top: gear.top, height: gear.height, width: gear.width, left: gear.left, right: gear.right },
    firstRow: { top: first.top, height: first.height },
    gearInGroup: document.querySelector('.snc-gear').parentElement.className,
    gearIsTrailing: document.querySelector('.snc-group').lastElementChild === document.querySelector('.snc-gear'),
  };
});

/* 2. folded */
await tab.click('.snc-group');
const folded = await tab.evaluate(shell('Folded'));
await shot('2-folded.png');

/* 3. editing (unfolds, checkboxes appear) */
await tab.click('.snc-gear');
const editing = await tab.evaluate(shell('Editing'));
const checks = await tab.evaluate(() => document.querySelectorAll('[data-snc-check]').length);
await shot('3-editing.png');

/* 4. hide two extensions */
await tab.evaluate(() => {
  const boxes = [...document.querySelectorAll('[data-snc-check]')];
  for (const label of ['任务看板', '记忆系统']) {
    const box = boxes.find((b) => b.parentElement.querySelector('button').getAttribute('aria-label') === label);
    box.checked = false;
    box.dispatchEvent(new Event('change', { bubbles: true }));
  }
});
const hiddenAttrs = await tab.evaluate(() =>
  [...document.querySelectorAll('nav button')].map((b) => [b.getAttribute('aria-label'), b.getAttribute('data-snc-hidden')]));
await shot('4-editing-hidden.png');

/* 5. done editing -> hidden rows are gone from the flow */
await tab.click('.snc-gear');
const visibleRows = await tab.evaluate(() =>
  [...document.querySelectorAll('nav button')].filter((b) => b.getBoundingClientRect().height > 0).map((b) => b.getAttribute('aria-label')));
const stored = await tab.evaluate(() => localStorage.getItem('dsh-sidebar-nav-collapse:hidden'));
await shot('5-done.png');

await browser.close();
console.log(JSON.stringify({ geom, folded, editing, checks, hiddenAttrs, visibleRows, stored }, null, 2));
