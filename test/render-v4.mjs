/* Real-browser render of the plugin states inside a faithful host mock.
   Uses the real host class names and CSS values so the screenshots show what
   the DSH window actually looks like. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const puppeteer = require_(process.env.SNC_SHOT_DIR + '/node_modules/puppeteer-core');
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const LIB = path.join(HERE, '..', 'lib', 'client.js');
const OUT = process.argv[2] || path.join(HERE, '..', 'shots');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
fs.mkdirSync(OUT, { recursive: true });

const PANELS = ['插件', '自动化任务', '上下文洞察', '扩展管理', '任务看板', '记忆系统'];
const TABS = ['对话', '上下页', '画廊', '编队', '记忆系统'];

const page = () => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>
  :root{
    --dsw-alias-bg-base:#fff; --dsw-alias-label-primary:#1b1f24; --dsw-alias-label-secondary:#5b6470;
    --dsw-alias-label-tertiary:#8a929c; --dsw-alias-label-on-brand:#fff;
    --dsw-alias-border-l3:rgba(20,30,50,.12); --dsw-alias-brand-primary:#2b6cf6;
    --dsw-radius-md:12px; --dsw-radius-sm:8px;
    --dsw-alias-interactive-bg-hover:rgba(38,49,72,.06);
    --dsw-alias-interactive-bg-active:rgba(38,49,72,.1);
    --dsw-specific-sidebar-fill:#f7f8fa;
  }
  *{box-sizing:border-box}
  body{margin:0;font:14px/22px system-ui,"Segoe UI","Microsoft YaHei",sans-serif;background:#eef1f6}
  .frame{display:grid;grid-template-columns:240px minmax(0,1fr);height:100vh;overflow:hidden}
  .side{background:var(--dsw-specific-sidebar-fill);border-right:.5px solid var(--dsw-alias-border-l3);padding:10px 8px;overflow:hidden}
  .sideLabel{color:var(--dsw-alias-label-secondary);font-size:12px;padding:0 8px 6px}
  .panelList{display:flex;flex-direction:column;gap:4px;margin-bottom:8px}
  .panelRow{display:flex;align-items:center;gap:8px;min-height:36px;margin:0 2px;padding:7px 8px;
    border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);
    font:inherit;line-height:22px;text-align:left;cursor:pointer;width:calc(100% - 4px)}
  .panelRow:hover{background:var(--dsw-alias-interactive-bg-hover)}
  .panelGlyph{flex:none;display:inline-flex;width:16px;height:16px;color:var(--dsw-alias-label-secondary)}
  .panelTitle{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .center{display:flex;flex-direction:column;min-width:0;background:#fff}
  .conv{display:flex;flex-direction:column;height:100%}
  .header{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l3);min-height:76px;
    padding:10px 28px 0 20px;display:grid;grid-template-columns:auto minmax(0,1fr)}
  .headerLeading{display:flex;align-items:center;gap:8px;grid-area:1/1;color:var(--dsw-alias-label-secondary);font-size:13px}
  .tabs{z-index:1;grid-column:1/-1;gap:36px;margin-top:10px;padding-left:8px;display:flex;position:relative}
  .tab{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;padding:0 0 9px;
    font-size:13px;font-weight:500;line-height:16px;position:relative;white-space:nowrap;font-family:inherit}
  .tabActive{color:var(--dsw-alias-label-primary)}
  .body{padding:24px;color:var(--dsw-alias-label-secondary);font-size:13px}
</style></head><body>
<div class="frame">
  <div class="side">
    <div class="sideLabel">全局面板</div>
    <nav class="panelList" aria-label="全局面板">
      ${PANELS.map((p) => `<button class="panelRow" aria-label="${p}"><span class="panelGlyph">▦</span><span class="panelTitle">${p}</span></button>`).join('')}
    </nav>
    <div class="sideLabel" style="padding-top:10px">Workspace and sessions</div>
  </div>
  <div class="center"><div class="conv">
    <div class="header">
      <div class="headerLeading">更新插件并实现扩展管理折叠功能</div>
      <div class="tabs" role="tablist" data-conversation-tabs>
        ${TABS.map((t, i) => `<button type="button" role="tab" aria-selected="${i === 0}" class="tab${i === 0 ? ' tabActive' : ''}">${t}</button>`).join('')}
      </div>
    </div>
    <div class="body">conversation body</div>
  </div></div>
</div></body></html>`;

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
const tab = await browser.newPage();

/* a throwaway origin so localStorage behaves exactly as it does inside DSH */
const http = await import('node:http');
let HTML = '';
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(HTML);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
HTML = page();
await tab.setViewport({ width: 900, height: 560, deviceScaleFactor: 2 });

async function load(stored) {
  /* localStorage needs a real http origin; a tiny local server avoids
     about:blank / data: restrictions entirely */
  await tab.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await tab.evaluate((s) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(s || {})) localStorage.setItem(k, v);
  }, stored);
  await tab.evaluate((code) => {
    let bundle;
    window.__ModuleLoader__ = { load: (v) => { bundle = v; } };
    new Function(code)();
    const client = bundle.factory(() => { throw new Error('dep'); });
    window.__snc = client;
    client.apply({ effect: (fn) => { window.__sncOff = fn(); } });
  }, fs.readFileSync(LIB, 'utf8'));
  await new Promise((r) => setTimeout(r, 60));
}

const shot = async (name) => tab.screenshot({ path: path.join(OUT, name) });
const click = async (sel) => { await tab.evaluate((s) => document.querySelector(s).click(), sel); await new Promise((r) => setTimeout(r, 60)); };
const measure = () => tab.evaluate(() => {
  const strip = document.querySelector('[data-conversation-tabs]');
  const tabs = [...strip.querySelectorAll('[role="tab"]')];
  const vis = tabs.filter((t) => getComputedStyle(t).display !== 'none');
  return {
    editing: strip.dataset.sncEditing,
    boxes: strip.querySelectorAll('[data-snc-tab-check]').length,
    visibleTabs: vis.map((t) => t.textContent),
    hiddenAttrs: tabs.filter((t) => t.dataset.sncHidden).map((t) => t.textContent),
    shellFolded: document.querySelector('.snc-shell')?.dataset.sncFolded,
    panelRowsVisible: [...document.querySelectorAll('nav[aria-label="全局面板"] > button, nav[aria-label="全局面板"] > .snc-entry')]
      .filter((n) => getComputedStyle(n).display !== 'none').length,
  };
});

const report = {};

// 1. plain expanded state
await load({});
report.plain = await measure();
await shot('v4-1-expanded.png');

// 2. edit mode: both groups get checkboxes
await click('.snc-gear');
report.editing = await measure();
// the box must share the label's centre line (chat has no box: it is pinned)
report.alignment = await tab.evaluate(() => {
  return [...document.querySelectorAll('.snc-tabitem')].map((item) => {
    const boxEl = item.querySelector('.snc-tabbox');
    const labelEl = item.querySelector('[role="tab"]');
    const range = document.createRange();
    range.selectNodeContents(labelEl);
    const textR = range.getBoundingClientRect();
    const textCenterY = textR.top + textR.height / 2;
    if (!boxEl) {
      return { tab: item.textContent.trim(), pinned: true, textCenterY: +textCenterY.toFixed(1) };
    }
    const box = boxEl.getBoundingClientRect();
    const boxCenterY = box.top + box.height / 2;
    return {
      tab: item.textContent.trim(),
      pinned: false,
      boxCenterY: +boxCenterY.toFixed(1),
      textCenterY: +textCenterY.toFixed(1),
      deltaY: +Math.abs(boxCenterY - textCenterY).toFixed(2),
      boxSize: `${Math.round(box.width)}x${Math.round(box.height)}`,
    };
  });
});
await shot('v4-2-editing.png');

// 3. hide two view tabs + one panel
await tab.evaluate(() => {
  const boxes = [...document.querySelectorAll('[data-snc-tab-check]')];
  for (const i of [2, 3]) { boxes[i].checked = false; boxes[i].dispatchEvent(new Event('change', { bubbles: true })); }
  const panelBox = document.querySelectorAll('[data-snc-check]')[5];
  panelBox.checked = false;
  panelBox.dispatchEvent(new Event('change', { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 80));
report.hiddenWhileEditing = await measure();
// while editing, a hidden tab must keep its LABEL readable next to its box
report.hiddenLabels = await tab.evaluate(() =>
  [...document.querySelectorAll('.snc-tabitem')].map((item) => {
    const tabEl = item.querySelector('[role="tab"]');
    const cs = getComputedStyle(tabEl);
    return {
      tab: tabEl.textContent.trim(),
      hidden: tabEl.dataset.sncHidden === 'true',
      display: cs.display,
      opacity: cs.opacity,
      boxPresent: !!item.querySelector('.snc-tabbox'),
    };
  }),
);
await shot('v4-3-editing-hidden.png');

// 4. leave edit mode: hidden entries go away
await click('.snc-gear');
report.afterExit = await measure();
await shot('v4-4-applied.png');

// 5. folded
await click('.snc-group');
report.folded = await measure();
await shot('v4-5-folded.png');

// 6. narrow phone width with the sidebar folded (the phone workflow the user described)
await tab.setViewport({ width: 390, height: 720, deviceScaleFactor: 2 });
await shot('v4-6-phone.png');
report.phone = await tab.evaluate(() => {
  const strip = document.querySelector('[data-conversation-tabs]');
  const tabs = [...strip.querySelectorAll('[role="tab"]')];
  return { stripWidth: Math.round(strip.getBoundingClientRect().width), tabsVisible: tabs.filter((t) => getComputedStyle(t).display !== 'none').length };
});

await browser.close();
server.close();
console.log(JSON.stringify(report, null, 2));
