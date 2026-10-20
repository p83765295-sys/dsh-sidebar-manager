/* Mobile/narrow-screen layout probe for the host conversation tabs.
   Replicates the real host CSS (.Dc7zOa_header / .tabs) at phone widths and
   measures whether the tab strip overflows and how much is clipped. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const puppeteer = require_(process.env.SNC_SHOT_DIR + '/node_modules/puppeteer-core');
const OUT = process.argv[2] || 'C:/Users/52332/.dsh/_localsrc/dsh-sidebar-nav-collapse/shots';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
fs.mkdirSync(OUT, { recursive: true });

const TABS = ['对话', '上下页', '画廊', '编队', '记忆系统'];
const page = (w) => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{
    --dsw-alias-bg-base:#fff; --dsw-alias-label-primary:#1b1f24; --dsw-alias-label-secondary:#5b6470;
    --dsw-alias-label-tertiary:#8a929c; --dsw-alias-border-l3:rgba(20,30,50,.12);
    --dsw-alias-brand-primary:#2b6cf6; --dsw-radius-md:12px; --dsw-specific-sidebar-fill:#f7f8fa;
  }
  *{box-sizing:border-box}
  body{margin:0;font:13px/1.4 system-ui,"Segoe UI","Microsoft YaHei",sans-serif;background:#eef1f6}
  /* ---- host shell (from dsh-client-ui-layout) ---- */
  .BynINW_frame{display:grid;grid-template-rows:minmax(0,1fr) auto;height:100vh;position:relative;overflow:hidden;background:var(--dsw-alias-bg-base)}
  .BynINW_sidebarCol{background:var(--dsw-specific-sidebar-fill);border-right:.5px solid var(--dsw-alias-border-l3);min-width:0;overflow:hidden}
  .BynINW_centerCol{display:flex;flex-direction:column;min-width:0;overflow:hidden;background:var(--dsw-alias-bg-base)}
  /* ---- conversation (from dsh-client-ui-conversation) ---- */
  .Dc7zOa_root{background:var(--dsw-alias-bg-base);flex-direction:column;min-width:0;height:100%;display:flex;position:relative}
  .Dc7zOa_header{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l3);flex:none;
    grid-template-columns:auto minmax(0,1fr);min-height:76px;padding:10px 28px 0 20px;display:grid}
  .Dc7zOa_headerLeading{flex:none;grid-area:1/1;align-items:center;gap:8px;display:flex}
  .Dc7zOa_headerActions{flex:none;align-items:center;gap:8px;display:flex}
  .Dc7zOa_headerCorner{flex:none;align-items:center;margin-left:8px;margin-right:-16px;display:flex}
  .Dc7zOa_tabs{z-index:1;grid-column:1/-1;gap:36px;margin-top:10px;padding-left:8px;display:flex;position:relative}
  .Dc7zOa_tab{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;padding:0 0 9px;
    font-size:13px;font-weight:500;line-height:16px;position:relative;white-space:nowrap}
  .Dc7zOa_tabActive{color:var(--dsw-alias-label-primary)}
  .Dc7zOa_crumbCurrent{color:var(--dsw-alias-label-secondary)}
  .side-inner{padding:10px}
  .row{display:flex;align-items:center;gap:8px;min-height:36px;padding:7px 8px;border-radius:12px;color:var(--dsw-alias-label-primary)}
  .row:hover{background:rgba(20,30,50,.06)}
</style></head><body>
<div class="BynINW_frame" style="grid-template-columns:240px minmax(0,1fr)">
  <div class="BynINW_sidebarCol"><div class="side-inner">
    <div class="row">会话</div><div class="row">Workspace and sessions</div>
    <div class="row">插件</div><div class="row">自动化任务</div>
  </div></div>
  <div class="BynINW_centerCol"><div class="Dc7zOa_root">
    <div class="Dc7zOa_header">
      <div class="Dc7zOa_headerLeading"><span class="Dc7zOa_crumbCurrent">更新插件并实现扩展管理折叠功能</span></div>
      <div class="Dc7zOa_tabs" role="tablist" data-conversation-tabs>
        ${TABS.map((t, i) => `<button type="button" role="tab" class="Dc7zOa_tab${i === 0 ? ' Dc7zOa_tabActive' : ''}" aria-selected="${i === 0}">${t}</button>`).join('')}
      </div>
    </div>
    <div style="padding:20px;color:var(--dsw-alias-label-secondary)">conversation body</div>
  </div></div>
</div></body></html>`;

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
const report = [];
for (const w of [390, 430, 768, 1024, 1440]) {
  const tab = await browser.newPage();
  await tab.setViewport({ width: w, height: 640, deviceScaleFactor: 2 });
  await tab.setContent(page(w), { waitUntil: 'load' });
  const m = await tab.evaluate(() => {
    const strip = document.querySelector('[data-conversation-tabs]');
    const btns = [...strip.querySelectorAll('[role="tab"]')];
    const center = document.querySelector('.BynINW_centerCol').getBoundingClientRect();
    const last = btns.at(-1).getBoundingClientRect();
    const stripBox = strip.getBoundingClientRect();
    return {
      stripWidth: Math.round(stripBox.width),
      stripScrollWidth: Math.round(strip.scrollWidth),
      overflowPx: Math.round(strip.scrollWidth - stripBox.width),
      lastTabRight: Math.round(last.right),
      centerRight: Math.round(center.right),
      clippedTabs: btns.filter((b) => b.getBoundingClientRect().right > center.right + 0.5).map((b) => b.textContent),
      scrollable: getComputedStyle(strip).overflowX,
    };
  });
  report.push({ width: w, ...m });
  await tab.screenshot({ path: path.join(OUT, `mobile-${w}.png`), fullPage: false });
  await tab.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
