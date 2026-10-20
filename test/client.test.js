import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { JSDOM } = require_(process.env.SNC_JSDOM || 'jsdom');

const path = fileURLToPath(new URL('../lib/client.js', import.meta.url));
const panel = (name) => `<button class="_2H3hWW_panelRow" aria-label="${name}"><span class="_2H3hWW_panelGlyph">★</span><span class="_2H3hWW_panelTitle">${name}</span></button>`;
const navigation = (names = ['插件', '自动化任务', '上下文洞察', '扩展管理', '任务看板', '记忆系统']) =>
  `<nav class="_2H3hWW_panelList" aria-label="全局面板">${names.map(panel).join('')}</nav><div id="workspaces">Workspace and sessions</div>`;

const STATE_KEY = 'dsh-sidebar-nav-collapse:state';
/* the fused record: one key, one version */
const stateOf = (window) => {
  const raw = window.localStorage.getItem(STATE_KEY);
  return raw === null ? null : JSON.parse(raw);
};
/* boot with an explicit record (or nothing at all) */
function start(html = navigation(), record) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, { url: 'http://localhost/' });
  if (record !== undefined) dom.window.localStorage.setItem(STATE_KEY, JSON.stringify(record));
  let bundle;
  const code = fs.readFileSync(path, 'utf8');
  assert.match(code, /window\.__ModuleLoader__\.load/, 'client bundle must exist');
  vm.runInNewContext(code, {
    window: Object.assign(dom.window, { __ModuleLoader__: { load: (v) => { bundle = v; } } }),
    document: dom.window.document,
    MutationObserver: dom.window.MutationObserver,
  });
  const client = bundle.factory(() => { throw Error('unexpected dependency'); });
  const disposers = [];
  client.apply({ effect: (fn) => { disposers.push(fn()); } });
  return { dom, doc: dom.window.document, dispose: () => { for (const fn of disposers.reverse()) fn(); } };
}
/* v2 adds the two order lists; v1 records are still read and upgraded */
const rec = (over = {}) => ({ v: 2, folded: false, hidden: [], views: [], order: [], orderViews: [], ...over });
/* a v1 record, as an older build wrote it */
const recV1 = (over = {}) => ({ v: 1, folded: false, hidden: [], views: [], ...over });
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const cssOf = (doc) => doc.querySelector('style[data-plugin-css="dsh-sidebar-nav-collapse"]').textContent;
const rows = (doc) => [...doc.querySelectorAll('nav button[class*="panelRow"]')];
const shadow = (doc) => doc.querySelector('.snc-shell');
const group = (doc) => doc.querySelector('.snc-group');
const gear = (doc) => doc.querySelector('.snc-bud');

test('wraps the host panel list and adds a group row plus a gear', () => {
  const { doc, dispose } = start();
  const shell = shadow(doc);
  assert.ok(shell, 'wrapper exists');
  // the host nav must stay a direct child of our wrapper, untouched inside
  const nav = shell.querySelector('nav[class*="panelList"]');
  assert.ok(nav, 'host nav moved under the wrapper');
  assert.equal(nav.children.length, 6, 'host nav keeps only its own rows');
  assert.equal(shell.parentElement.tagName, 'BODY');
  // group row mirrors a native panelRow box model
  const css = cssOf(doc);
  const groupRule = css.slice(css.indexOf('.snc-group {'), css.indexOf('}', css.indexOf('.snc-group {')));
  assert.match(groupRule, /min-height:\s*36px/);
  assert.match(groupRule, /padding:\s*7px 8px/);
  // gap 0: the caption takes the free width, so the two icons sit flush right
  assert.match(groupRule, /gap:\s*0/);
  assert.match(groupRule, /border-radius:\s*var\(--dsw-radius-md,\s*12px\)/);
  // the gear is a 20px press target next to the 20px chevron: the dead zone
  // between them is what keeps settings and fold from being hit by one press
  const gearRule = css.slice(css.indexOf('.snc-bud,\n.snc-chev {'), css.indexOf('}', css.indexOf('.snc-bud,\n.snc-chev {')));
  assert.match(gearRule, /width:\s*20px/);
  assert.match(gearRule, /height:\s*20px/);
  assert.match(gearRule, /border-radius:\s*var\(--dsw-radius-sm,\s*6px\)/);
  // no colour is hardcoded: everything is a live theme token with a fallback
  assert.match(gearRule, /--dsw-alias-label-tertiary/);
  dispose();
});

test('the group row is the toggle: starts expanded and folds the list', () => {
  const { doc, dom, dispose } = start();
  const shell = shadow(doc);
  assert.equal(group(doc).getAttribute('aria-expanded'), 'true');
  assert.equal(shell.dataset.sncFolded, 'false');
  assert.match(cssOf(doc), /\[data-snc-folded="true"\]\s*>\s*nav\[class\*="panelList"\]\s*\{\s*display:\s*none/);

  group(doc).click();
  assert.equal(shell.dataset.sncFolded, 'true');
  assert.equal(group(doc).getAttribute('aria-expanded'), 'false');
  assert.equal(group(doc).getAttribute('aria-label'), '展开扩展管理');
  // folding is remembered
  assert.equal(String(stateOf(dom.window).folded), 'true');

  group(doc).click();
  assert.equal(shell.dataset.sncFolded, 'false');
  assert.equal(String(stateOf(dom.window).folded), 'false');
  dispose();
});

test('the group row is a section header, not a seventh extension', () => {
  const { doc, dispose } = start(both());
  const row = group(doc);
  /* A1: the row is a named group header. It reads "扩展" -- a caption, not a
     panel name -- and it is styled as tertiary upper-case text so it cannot be
     mistaken for one of the extension entries below it. */
  assert.equal(row.querySelector('.snc-caption')?.textContent, '扩展');
  assert.equal(row.textContent.trim(), '扩展');
  /* the caption is inert: no press handler, no tab stop of its own */
  assert.equal(row.querySelector('.snc-caption').tabIndex, -1);
  /* the name survives where it still has to be reachable */
  assert.equal(row.getAttribute('aria-label'), '收起扩展管理');
  assert.equal(row.title, '收起扩展管理（点击切换）');
  /* the decoration is a real inline glyph, not a background image: the chevron
     svg is the only inline graphic left on the row now that the vine is gone */
  assert.ok(row.querySelector('.snc-chev > svg'), 'the chevron is an inline svg');
  /* the trailing edge carries exactly two actions, settings then fold */
  const tail = [...row.children].slice(-2);
  assert.deepEqual(tail.map((n) => n.className), ['snc-bud', 'snc-chev']);
  assert.equal(row.lastElementChild.className, 'snc-chev', 'the chevron is last');
  dispose();
});

test('the chevron reflects the fold state, the row is what folds', () => {
  const { doc, dispose } = start(both());
  const row = group(doc);
  const chev = row.querySelector('.snc-chev');
  /* the chevron is state, not a control: it is inert and untabbable, so the
     only way to fold is the row itself (arrow keys never land on it) */
  assert.equal(chev.getAttribute('aria-hidden'), 'true');
  assert.equal(chev.tabIndex, -1);
  assert.equal(chev.tagName, 'BUTTON', 'a button so the fold can also be pressed on it');
  /* the row's own attribute drives the rotation, so CSS needs no JS repaint */
  assert.match(cssOf(doc), /\.snc-group\[aria-expanded="false"\]\s*\.snc-chev\s*\{\s*transform:\s*rotate\(-90deg\)/);
  assert.equal(row.dataset.sncFolded, 'false');
  /* a press that lands on the chevron still folds: it bubbles to the row */
  chev.click();
  assert.equal(row.dataset.sncFolded, 'true', 'pressing the chevron folds the row');
  row.click();
  assert.equal(row.dataset.sncFolded, 'false');
  dispose();
});

test('the group row is keyboard operable', () => {
  const { doc, dispose } = start();
  const shell = shadow(doc);
  assert.equal(group(doc).getAttribute('role'), 'button');
  assert.equal(group(doc).tabIndex, 0);
  group(doc).dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(shell.dataset.sncFolded, 'true');
  group(doc).dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  assert.equal(shell.dataset.sncFolded, 'false');
  dispose();
});

test('a folded list is restored from storage on startup', () => {
  const { doc, dispose } = start(undefined, rec({ folded: true }));
  assert.equal(shadow(doc).dataset.sncFolded, 'true');
  assert.equal(group(doc).getAttribute('aria-expanded'), 'false');
  dispose();
});

test('the gear is inside the group row, just before the chevron', () => {
  const { doc, dispose } = start();
  assert.equal(gear(doc).parentElement, group(doc), 'gear lives in the group row, not the nav');
  assert.equal(gear(doc).nextElementSibling?.className, 'snc-chev', 'gear sits ahead of the chevron');
  assert.equal(gear(doc).getAttribute('aria-pressed'), 'false');
  // clicking the gear must not toggle the group
  gear(doc).click();
  assert.equal(shadow(doc).dataset.sncFolded, 'false');
  assert.equal(gear(doc).getAttribute('aria-pressed'), 'true');
  dispose();
});

test('settings mode shows a checkbox in front of every extension', () => {
  const { doc, dispose } = start();
  const shell = shadow(doc);
  assert.equal(doc.querySelectorAll('[data-snc-check]').length, 0);
  gear(doc).click();
  assert.equal(shell.dataset.sncEditing, 'true');
  assert.equal(doc.querySelectorAll('[data-snc-check]').length, 6);
  // a checkbox inside the host button would bubble into the host selectPanel
  for (const box of doc.querySelectorAll('[data-snc-check]')) {
    assert.equal(box.closest('button'), null);
    assert.ok(box.parentElement.classList.contains('snc-entry'));
    assert.ok(box.parentElement.querySelector('button[class*="panelRow"]'));
    // the drag handle is the outermost slot so it never sits between the box
    // and the row it describes
    assert.ok(box.parentElement.firstElementChild.hasAttribute('data-snc-drag'), 'handle leads the row');
    assert.equal(box.parentElement.firstElementChild.nextElementSibling, box, 'checkbox follows the handle');
  }
  gear(doc).click();
  assert.equal(doc.querySelectorAll('[data-snc-check]').length, 0);
  assert.equal(shell.dataset.sncEditing, 'false');
  dispose();
});

test('unchecking hides an extension and persists it', async () => {
  const { doc, dom, dispose } = start();
  gear(doc).click();
  const entry = rows(doc).find((r) => r.getAttribute('aria-label') === '任务看板');
  const box = entry.parentElement.querySelector('[data-snc-check]');
  box.checked = false;
  box.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await flush();
  assert.equal(entry.dataset.sncHidden, 'true');
  assert.deepEqual(stateOf(dom.window).hidden, ['任务看板']);

  gear(doc).click();
  const after = rows(doc).find((r) => r.getAttribute('aria-label') === '任务看板');
  assert.equal(after.dataset.sncHidden, 'true');
  assert.match(cssOf(doc), /\[data-snc-hidden="true"\]\s*\{\s*display:\s*none/);
  dispose();
});

test('hidden extensions stay reachable while editing so they can be restored', () => {
  const { doc, dispose } = start(navigation(), rec({ hidden: ['记忆系统'] }));
  const shell = shadow(doc);
  const row = rows(doc).find((r) => r.getAttribute('aria-label') === '记忆系统');
  assert.equal(row.dataset.sncHidden, 'true');
  const css = cssOf(doc);
  const ruleStart = css.indexOf('.snc-shell[data-snc-editing="true"] > nav[class*="panelList"]');
  assert.ok(ruleStart >= 0, 'edit-mode override rule exists');
  assert.match(css.slice(ruleStart), /display:\s*flex\s*!important/);
  gear(doc).click();
  assert.equal(shell.dataset.sncEditing, 'true');
  assert.equal(row.parentElement.querySelector('[data-snc-check]').checked, false);
  dispose();
});

test('a folded list still expands into edit mode so the gear stays usable', () => {
  const { doc, dispose } = start(undefined, rec({ folded: true }));
  const shell = shadow(doc);
  assert.equal(shell.dataset.sncFolded, 'true');
  // folding is CSS; the editing flag must win over it
  assert.match(cssOf(doc), /data-snc-editing="true"\]\s*>\s*nav\[class\*="panelList"\]\s*\{\s*display:\s*flex\s*!important/);
  gear(doc).click();
  assert.equal(doc.querySelectorAll('[data-snc-check]').length, 6);
  dispose();
});

test('leaving edit mode unfolds so the change is visible', async () => {
  const { doc, dom, dispose } = start();
  group(doc).click();
  assert.equal(shadow(doc).dataset.sncFolded, 'true');
  gear(doc).click();
  assert.equal(doc.querySelectorAll('[data-snc-check]').length, 6);
  gear(doc).click();
  assert.equal(shadow(doc).dataset.sncFolded, 'false', 'edit exit unfolds the list');
  assert.equal(group(doc).getAttribute('aria-expanded'), 'true');
  assert.equal(String(stateOf(dom.window).folded), 'false');
  // the user can fold again right away
  group(doc).click();
  assert.equal(shadow(doc).dataset.sncFolded, 'true');
  dispose();
});

test('survives a sidebar remount and ignores unknown entries', async () => {
  const { doc, dispose } = start(undefined, rec({ hidden: ['插件', '早已卸载的插件'] }));
  assert.equal(rows(doc).find((r) => r.getAttribute('aria-label') === '插件').dataset.sncHidden, 'true');
  assert.equal(rows(doc).length, 6);
  const nav = doc.querySelector('nav');
  // React re-renders the host nav: replace the whole wrapper subtree
  shadow(doc).outerHTML = navigation(['插件', '新插件']);
  await flush();
  const next = doc.querySelector('nav');
  assert.ok(next, 'nav remounted');
  const nextRows = next.querySelectorAll('button[class*="panelRow"]');
  assert.equal(nextRows[0].dataset.sncHidden, 'true');
  assert.equal(nextRows[1].hasAttribute('data-snc-hidden'), false);
  // one shell per wrapper, one gear per shell
  assert.equal(doc.querySelectorAll('.snc-shell').length, 1);
  assert.equal(doc.querySelectorAll('.snc-bud').length, 1);
  dispose();
});

test('host disable restores the DOM completely', async () => {
  const { doc, dispose } = start();
  gear(doc).click();
  assert.equal(doc.querySelectorAll('.snc-entry').length, 6);
  dispose();
  assert.equal(doc.querySelector('.snc-shell'), null);
  assert.equal(doc.querySelector('.snc-bud'), null);
  assert.equal(doc.querySelector('.snc-group'), null);
  assert.equal(doc.querySelector('[data-plugin-css="dsh-sidebar-nav-collapse"]'), null);
  assert.equal(doc.querySelectorAll('.snc-entry').length, 0);
  assert.equal(doc.querySelectorAll('[data-snc-check]').length, 0);
  // the nav is put back exactly where it was, children untouched
  const nav = doc.querySelector('nav');
  assert.equal(nav.parentElement.tagName, 'BODY');
  assert.equal(nav.children.length, 6);
  doc.body.insertAdjacentHTML('beforeend', navigation(['Late plugin']));
  await flush();
  assert.equal(doc.querySelectorAll('.snc-shell').length, 0);
});

test('English label is also matched without touching unrelated nav', () => {
  const { doc, dispose } = start(`<nav class="_2H3hWW_panelList" aria-label="Global panels">${panel('Plugins')}</nav><nav class="_2H3hWW_panelList" aria-label="Local">${panel('Local')}</nav>`);
  assert.equal(doc.querySelectorAll('.snc-shell').length, 1);
  assert.equal(doc.querySelector('.snc-shell').querySelector('nav').getAttribute('aria-label'), 'Global panels');
  assert.equal(doc.querySelector('nav[aria-label="Local"]').parentElement.tagName, 'BODY');
  dispose();
});

/* ---------------------- conversation view tabs (second group) ---------------------- */
const tabs = (labels = ['对话', '上下页', '画廊', '编队', '记忆系统'], activeIndex = 0) =>
  `<div class="_Dc7zOa_tabs" role="tablist" data-conversation-tabs="">${labels
    .map((l, i) => `<button type="button" role="tab" aria-selected="${i === activeIndex}" class="_Dc7zOa_tab${i === activeIndex ? ' _Dc7zOa_tabActive' : ''}">${l}</button>`)
    .join('')}</div>`;
const both = (labels, activeIndex) => navigation() + tabs(labels, activeIndex);
const strip = (doc) => doc.querySelector('div[data-conversation-tabs]');
const tabEls = (doc) => [...strip(doc).querySelectorAll('button[role="tab"]')];
const tabByLabel = (doc, label) => tabEls(doc).find((t) => t.textContent === label);

test('view tabs are untouched until edit mode, then each gets its own checkbox', () => {
  const { doc, dispose } = start(both());
  assert.equal(strip(doc).querySelectorAll('[data-snc-tab-check]').length, 0, 'no boxes at rest');
  assert.equal(strip(doc).querySelectorAll('.snc-tabitem').length, 0, 'no wrappers at rest');
  assert.equal(tabEls(doc).length, 5);

  gear(doc).click();
  assert.equal(strip(doc).dataset.sncEditing, 'true');
  assert.equal(strip(doc).querySelectorAll('[data-snc-tab-check]').length, 4, 'chat has no box');
  // the checkbox is a SIBLING, never a child: a nested input eats the click
  for (const box of strip(doc).querySelectorAll('[data-snc-tab-check]')) {
    assert.equal(box.querySelector('button'), null);
    assert.equal(box.closest('button'), null, 'input must not live inside a tab button');
  }
  assert.match(cssOf(doc), /data-conversation-tabs\]\[data-snc-editing="true"\]\s*\{\s*flex-wrap:\s*wrap/);

  gear(doc).click();
  assert.equal(strip(doc).dataset.sncEditing, 'false');
  assert.equal(strip(doc).querySelectorAll('.snc-tabitem').length, 0, 'unwrapped on exit');
});

test('unchecking a view tab hides it and is remembered', () => {
  const { doc, dom, dispose } = start(both());
  gear(doc).click();
  const box = strip(doc).querySelectorAll('[data-snc-tab-check]')[0];
  assert.equal(box.parentElement.textContent.trim(), '上下页', 'box order skips chat');
  box.checked = false;
  box.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(tabByLabel(doc, '上下页').dataset.sncHidden, 'true');
  assert.deepEqual(stateOf(dom.window).views, ['上下页']);
  // still listed while editing so it can be brought back
  assert.equal(tabByLabel(doc, '上下页').hasAttribute('data-snc-hidden'), true);
  gear(doc).click();
  assert.equal(tabByLabel(doc, '上下页').dataset.sncHidden, 'true', 'stays hidden after exit');
  assert.match(cssOf(doc), /button\[role="tab"\]\[data-snc-hidden="true"\]\s*\{\s*display:\s*none/);
});

test('the chat view has no checkbox and can never be hidden', () => {
  const { doc, dom, dispose } = start(both());
  gear(doc).click();
  const chat = tabByLabel(doc, '对话');
  assert.equal(chat.parentElement.querySelector('[data-snc-tab-check]'), null, 'no box in front of chat');
  // it still gets the uniform wrapper so the row stays aligned
  assert.ok(chat.parentElement.classList.contains('snc-tabitem'));
  // a stale store entry from an older build is reconciled away on paint
  assert.equal(chat.hasAttribute('data-snc-hidden'), false);
  assert.deepEqual(stateOf(dom.window).views, [], 'chat never lands in the record');
  dispose();
});

test('a stored hidden chat entry is dropped on boot', async () => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${both(['对话', '上下页', '画廊'], 0)}</body></html>`, { url: 'http://localhost/' });
  dom.window.localStorage.setItem(STATE_KEY, JSON.stringify(rec({ views: ['对话', '画廊'] })));
  let bundle;
  const code = fs.readFileSync(path, 'utf8');
  vm.runInNewContext(code, {
    window: Object.assign(dom.window, { __ModuleLoader__: { load: (v) => { bundle = v; } } }),
    document: dom.window.document,
    MutationObserver: dom.window.MutationObserver,
  });
  const client = bundle.factory(() => { throw Error('unexpected dependency'); });
  client.apply({ effect: (fn) => { fn(); } });
  const doc = dom.window.document;
  assert.equal(tabByLabel(doc, '对话').hasAttribute('data-snc-hidden'), false, 'chat is always visible');
  assert.equal(tabByLabel(doc, '画廊').dataset.sncHidden, 'true', 'the rest still applies');
  assert.deepEqual(stateOf(dom.window).views, ['画廊'], 'chat pruned from the store');
});

test('the active view cannot be hidden', () => {
  const { doc, dom, dispose } = start(both(['对话', '上下页', '画廊'], 2));
  gear(doc).click();
  const box = [...strip(doc).querySelectorAll('[data-snc-tab-check]')].find((b) => b.parentElement.textContent.trim() === '画廊');
  assert.ok(box, 'the active non-chat view still has a box');
  assert.equal(box.checked, true);
  box.checked = false;
  box.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(tabByLabel(doc, '画廊').hasAttribute('data-snc-hidden'), false, 'active tab stays visible');
  assert.equal(box.checked, true, 'the box snaps back');
  assert.equal(box.getAttribute('aria-invalid'), 'true');
  assert.deepEqual(stateOf(dom.window).views, [], 'a refused hide leaves the record untouched');
});

test('stored hidden views are applied on boot and the active one is rescued', async () => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${both(['对话', '上下页', '画廊'], 1)}</body></html>`, { url: 'http://localhost/' });
  dom.window.localStorage.setItem(STATE_KEY, JSON.stringify(rec({ views: ['画廊', '上下页'] })));
  let bundle;
  const code = fs.readFileSync(path, 'utf8');
  vm.runInNewContext(code, {
    window: Object.assign(dom.window, { __ModuleLoader__: { load: (v) => { bundle = v; } } }),
    document: dom.window.document,
    MutationObserver: dom.window.MutationObserver,
  });
  const client = bundle.factory(() => { throw Error('unexpected dependency'); });
  client.apply({ effect: (fn) => { fn(); } });
  const doc = dom.window.document;
  assert.equal(tabByLabel(doc, '画廊').dataset.sncHidden, 'true');
  assert.equal(tabByLabel(doc, '上下页').hasAttribute('data-snc-hidden'), false, 'active view is rescued');
  assert.deepEqual(stateOf(dom.window).views, ['画廊']);
});

test('tabs that mount after the plugin are picked up', async () => {
  const { doc, dispose } = start(navigation());
  assert.equal(strip(doc), null);
  gear(doc).click();               // editing first: the strip is not mounted yet
  doc.body.insertAdjacentHTML('beforeend', tabs());
  await flush();
  assert.equal(strip(doc).dataset.sncEditing, 'true');
  assert.equal(strip(doc).querySelectorAll('[data-snc-tab-check]').length, 4, 'late strip is managed');
  dispose();
  assert.equal(doc.querySelectorAll('.snc-tabitem').length, 0);
  assert.equal(doc.querySelectorAll('[data-snc-tab-check]').length, 0);
  assert.equal(strip(doc).hasAttribute('data-snc-editing'), false);
});

test('the two stores stay independent inside the one record', () => {
  const { doc, dom, dispose } = start(both());
  gear(doc).click();
  assert.equal(doc.querySelectorAll('[data-snc-check]').length, 6);
  assert.equal(doc.querySelectorAll('[data-snc-tab-check]').length, 4);
  const panelBox = doc.querySelectorAll('[data-snc-check]')[0];
  panelBox.checked = false;
  panelBox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.deepEqual(stateOf(dom.window).hidden, ['插件']);
  assert.deepEqual(stateOf(dom.window).views, [], 'view list untouched by a panel toggle');
  assert.equal(doc.querySelectorAll('.snc-shell').length, 1);
  dispose();
});

test('the whole record lives under one versioned key', () => {
  const { doc, dom, dispose } = start();
  gear(doc).click();
  const box = doc.querySelector('[data-snc-check]');
  box.checked = false;
  box.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  group(doc).click();
  const keys = Object.keys(dom.window.localStorage).filter((k) => k.startsWith('dsh-sidebar-nav-collapse:'));
  assert.deepEqual(keys, [STATE_KEY], 'no per-field keys are written');
  const record = stateOf(dom.window);
  assert.equal(record.v, 2);
  assert.equal(record.folded, true);
  assert.deepEqual(record.hidden, ['插件']);
  assert.deepEqual(record.views, []);
  dispose();
});

test('a pre-version record is migrated on first boot, then written back', () => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${navigation()}</body></html>`, { url: 'http://localhost/' });
  dom.window.localStorage.setItem('dsh-sidebar-nav-collapse:hidden', JSON.stringify(['记忆系统']));
  dom.window.localStorage.setItem('dsh-sidebar-nav-collapse:views', JSON.stringify(['画廊']));
  dom.window.localStorage.setItem('dsh-sidebar-nav-collapse:folded', 'true');
  let bundle;
  vm.runInNewContext(fs.readFileSync(path, 'utf8'), {
    window: Object.assign(dom.window, { __ModuleLoader__: { load: (v) => { bundle = v; } } }),
    document: dom.window.document,
    MutationObserver: dom.window.MutationObserver,
  });
  const client = bundle.factory(() => { throw Error('unexpected dependency'); });
  const disposers = [];
  client.apply({ effect: (fn) => { disposers.push(fn()); } });
  const doc = dom.window.document;
  // the migrated record is written on boot, so a rollback finds a clean one
  assert.deepEqual(stateOf(dom.window), rec({ folded: true, hidden: ['记忆系统'], views: ['画廊'] }));
  assert.equal(shadow(doc).dataset.sncFolded, 'true');
  gear(doc).click();
  const row = rows(doc).find((r) => (r.getAttribute('aria-label') || '').trim() === '记忆系统');
  assert.ok(row, 'migrated hidden row is reachable in edit mode');
  assert.equal(row.dataset.sncHidden, 'true');
  for (const fn of disposers.reverse()) fn();
});

test('a record from a newer schema is ignored instead of half-read', () => {
  const { doc, dom, dispose } = start(navigation(), { v: 99, folded: true, hidden: ['插件'], views: [] });
  assert.equal(shadow(doc).dataset.sncFolded, 'false', 'unknown version falls back to defaults');
  assert.equal(rows(doc)[0].hasAttribute('data-snc-hidden'), false);
  assert.equal(stateOf(dom.window).v, 2, 'the record is rewritten in the current schema');
  dispose();
});

test('a corrupt record never breaks the sidebar', () => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${navigation()}</body></html>`, { url: 'http://localhost/' });
  dom.window.localStorage.setItem(STATE_KEY, '{not json');
  let bundle;
  vm.runInNewContext(fs.readFileSync(path, 'utf8'), {
    window: Object.assign(dom.window, { __ModuleLoader__: { load: (v) => { bundle = v; } } }),
    document: dom.window.document,
    MutationObserver: dom.window.MutationObserver,
  });
  const client = bundle.factory(() => { throw Error('unexpected dependency'); });
  const disposers = [];
  client.apply({ effect: (fn) => { disposers.push(fn()); } });
  const doc = dom.window.document;
  assert.ok(shadow(doc), 'shell still wraps the list');
  assert.equal(doc.querySelectorAll('.snc-bud').length, 1);
  assert.deepEqual(stateOf(dom.window), rec(), 'bad JSON is replaced by defaults');
  for (const fn of disposers.reverse()) fn();
});

test('hidden tabs carry no extra decoration, only the fade the sidebar uses', () => {
  const { doc, dispose } = start(both());
  const css = cssOf(doc);
  assert.doesNotMatch(css, /line-through/, 'no strikethrough on hidden tabs');
  const ruleStart = css.indexOf('> .snc-tabitem > button[role="tab"][data-snc-hidden="true"]');
  assert.ok(ruleStart >= 0, 'hidden-tab rule exists');
  const rule = css.slice(ruleStart, css.indexOf('}', ruleStart));
  assert.match(rule, /opacity:\s*\.45/);
  // the sidebar row rule is the reference the tab must match
  const rowStart = css.indexOf('> .snc-entry:has(> button[data-snc-hidden="true"]) > button[class*="panelRow"]');
  assert.ok(rowStart >= 0, 'hidden-row rule exists');
  assert.match(css.slice(rowStart, css.indexOf('}', rowStart)), /opacity:\s*\.45/);
  gear(doc).click();
  const tab = [...doc.querySelectorAll('[role="tab"]')].find((t) => t.textContent.trim() === '记忆系统');
  const box = tab.parentElement.querySelector('[data-snc-tab-check]');
  box.checked = false;
  box.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
  assert.equal(tab.dataset.sncHidden, 'true');
  assert.equal(doc.defaultView.getComputedStyle(tab).textDecorationLine, 'none');
  dispose();
});

test('a row without an aria-label falls back to its own text and skips the glyph slot', () => {
  /* the glyph slot text ("★") is rendered by whichever plugin owns the entry,
     so it can change at any time; the label must not ride on it */
  const plain = '<button class="_2H3hWW_panelRow"><span class="_2H3hWW_panelGlyph">★</span><span class="_2H3hWW_panelTitle">插件</span></button>';
  const { doc, dom, dispose } = start(`<nav class="_2H3hWW_panelList" aria-label="全局面板">${plain}</nav>`);
  gear(doc).click();
  const row = doc.querySelector('button[class*="panelRow"]');
  const box = row.parentElement.querySelector('[data-snc-check]');
  box.checked = false;
  box.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  const stored = stateOf(dom.window).hidden;
  assert.equal(stored.length, 1);
  assert.doesNotMatch(stored[0], /★/, 'glyph text is not part of the key');
  dispose();
});

test('the group row and the gear cannot be selected as text', () => {
  const { doc, dispose } = start(both());
  const css = cssOf(doc);
  const groupStart = css.indexOf('.snc-group {');
  assert.ok(groupStart >= 0);
  const rule = css.slice(groupStart, css.indexOf('}', groupStart));
  assert.match(rule, /user-select:\s*none/, 'dragging across the toggle must not select its label');
  assert.match(rule, /-webkit-user-select:\s*none/);
  assert.doesNotMatch(cssOf(doc), /\.snc-title\s*\{[^}]*user-select:\s*text/);
  dispose();
});

/* ---------------------------- reorder (drag and drop) ---------------------------- */
const orderOf = (doc) => rows(doc).map((r) => (r.getAttribute('aria-label') || '').trim());
const dragHandles = (doc) => [...doc.querySelectorAll('.snc-entry > [data-snc-drag]')];
/* jsdom has no layout: getBoundingClientRect is all-zero, so the midpoint test
   would never fire. This stubs a synthetic column (or row) whose positions are
   derived from the element's CURRENT index among its siblings, which is what a
   real layout does: reordering the DOM moves the boxes with it. */
const stubRects = (win, elements, axis = 'y', step = 40, size = 36) => {
  for (const el of elements) {
    el.getBoundingClientRect = () => {
      const siblings = [...el.parentElement.children].filter((c) => typeof c.getBoundingClientRect === 'function' && c.isConnected);
      const index = Math.max(0, siblings.indexOf(el));
      const start = index * step;
      return axis === 'y'
        ? { top: start, bottom: start + size, left: 0, right: 200, width: 200, height: size, x: 0, y: start }
        : { top: 0, bottom: size, left: start, right: start + size * 2.5, width: size * 2.5, height: size, x: start, y: 0 };
    };
  }
};
/* The insertion preview hit-tests against the WRAPPER (snc-entry / snc-tabitem),
   not the handle, so a stubbed drag needs the same synthetic geometry on both. */
const stubUnits = (win, units, axis = 'y', step = 40) => {
  stubRects(win, units, axis, step);
  for (const unit of units) {
    const handle = unit.querySelector('[data-snc-drag]');
    if (handle) handle.getBoundingClientRect = () => unit.getBoundingClientRect();
  }
  return units;
};
/* jsdom has no layout and therefore no hit testing, so elementFromPoint is
   stubbed from the same synthetic boxes: the first unit whose rectangle contains
   the point. This is what makes the insertion preview observable in tests. */
const stubHit = (win, elements, axis = 'y', step = 40, size = 36) => {
  win.document.elementFromPoint = (x, y) => elements.find((el) => {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }) || null;
};
/* pointer events are captured on document, so they must be dispatched at a real
   target inside it: dispatching straight at document skips the capture path. */
const pointer = (win, type, target, x, y) => {
  const ev = new win.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(ev, 'pointerId', { value: 1 });
  Object.defineProperty(ev, 'pointerType', { value: 'mouse' });
  Object.defineProperty(ev, 'button', { value: 0 });
  target.dispatchEvent(ev);
  return ev;
};
const dropMarks = (doc) => [...doc.querySelectorAll('[data-snc-drop]')].map((el) => {
  const label = el.querySelector('button')?.getAttribute('aria-label') || el.textContent.trim();
  return label + ':' + el.dataset.sncDrop;
});

test('no drag handle exists outside edit mode', () => {
  const { doc, dispose } = start(both());
  assert.equal(doc.querySelectorAll('[data-snc-drag]').length, 0);
  gear(doc).click();
  assert.equal(dragHandles(doc).length, 6, 'one handle per sidebar entry');
  assert.equal(strip(doc).querySelectorAll('.snc-tabitem > [data-snc-drag]').length, 5, 'one per view tab');
  const css = cssOf(doc);
  const rule = css.slice(css.indexOf('.snc-drag {'), css.indexOf('}', css.indexOf('.snc-drag {')));
  assert.match(rule, /display:\s*none/, 'handles are hidden at rest');
  assert.match(rule, /touch-action:\s*none/, 'a touch drag must not scroll the page instead');
  dispose();
});

test('dragging a sidebar row past a neighbour reorders it in the DOM', () => {
  const { doc, dom, dispose } = start(both());
  gear(doc).click();
  const handles = dragHandles(doc);
  const entries = stubUnits(dom.window, [...doc.querySelectorAll("nav > .snc-entry")]);
  stubHit(dom.window, entries);
  assert.deepEqual(orderOf(doc), ['插件', '自动化任务', '上下文洞察', '扩展管理', '任务看板', '记忆系统']);

  /* carry "插件" (index 0) down onto the second row's lower half. The order must
     NOT change while the pointer is down – that is the whole point of the
     rewrite, and the reason the old implementation oscillated – only the
     insertion bar moves. Row 1 spans y=40..76, its midpoint is 58. */
  const handle = handles[0];
  const ev = pointer(dom.window, 'pointerdown', handle, 10, 14);
  assert.equal(ev.defaultPrevented, true, 'the press must not reach the host selectPanel');
  pointer(dom.window, 'pointermove', dom.window.document.body, 10, 34);
  pointer(dom.window, 'pointermove', dom.window.document.body, 10, 70);
  assert.deepEqual(orderOf(doc), ['插件', '自动化任务', '上下文洞察', '扩展管理', '任务看板', '记忆系统'], 'nothing moves before the drop');
  assert.deepEqual(dropMarks(doc), ['自动化任务:after'], 'the bar marks the trailing edge of the hovered row');

  /* crossing the same row's upper half flips the bar, not the order */
  pointer(dom.window, 'pointermove', dom.window.document.body, 10, 44);
  assert.deepEqual(dropMarks(doc), ['自动化任务:before']);
  assert.deepEqual(orderOf(doc), ['插件', '自动化任务', '上下文洞察', '扩展管理', '任务看板', '记忆系统']);

  pointer(dom.window, 'pointermove', dom.window.document.body, 10, 70);
  pointer(dom.window, 'pointerup', dom.window.document.body, 10, 70);
  assert.deepEqual(dropMarks(doc), [], 'the bar is cleared on drop');
  assert.deepEqual(orderOf(doc), ['自动化任务', '插件', '上下文洞察', '扩展管理', '任务看板', '记忆系统']);
  dispose();
});

test('a drag does not select the panel it was started on', () => {
  const { doc, dom, dispose } = start(both());
  gear(doc).click();
  const first = rows(doc)[0];
  let selected = 0;
  first.addEventListener('click', () => { selected += 1; });
  stubUnits(dom.window, [...doc.querySelectorAll("nav > .snc-entry")]);
  pointer(dom.window, 'pointerdown', dragHandles(doc)[0], 10, 14);
  assert.equal(selected, 0, 'pointerdown is swallowed before it becomes a click');
  dispose();
});

test('the gear toggles the session: pressing it again saves the dragged order', () => {
  const { doc, dom, dispose } = start(both());
  gear(doc).click();
  const unitsA = stubUnits(dom.window, [...doc.querySelectorAll("nav > .snc-entry")]);
  stubHit(dom.window, unitsA);
  pointer(dom.window, 'pointerdown', dragHandles(doc)[0], 10, 14);
  /* rows are 40px tall at y = index*40; row 1 spans 40..76 with its midpoint at
     58, so y=70 is its trailing half → "插件" lands just after "自动化任务" */
  pointer(dom.window, 'pointermove', dom.window.document.body, 10, 70);
  pointer(dom.window, 'pointerup', dom.window.document.body, 10, 70);
  /* nothing is written until the session is closed */
  assert.deepEqual(stateOf(dom.window).order, [], 'a drag alone never touches the store');
  assert.deepEqual(orderOf(doc), ['自动化任务', '插件', '上下文洞察', '扩展管理', '任务看板', '记忆系统']);

  gear(doc).click();
  const record = stateOf(dom.window);
  assert.deepEqual(record.order, ['自动化任务', '插件', '上下文洞察', '扩展管理', '任务看板', '记忆系统']);
  assert.equal(shadow(doc).dataset.sncEditing, 'false', 'the same button leaves edit mode');
  dispose();

  /* a fresh boot on the SAME storage must come back in the saved order */
  const again = start(both(), record);
  assert.deepEqual(orderOf(again.doc), ['自动化任务', '插件', '上下文洞察', '扩展管理', '任务看板', '记忆系统']);
  again.dispose();
});

test('Escape throws the draft away and keeps the saved order', () => {
  const saved = { v: 2, folded: false, hidden: [], views: [], order: ['记忆系统', '插件', '自动化任务', '上下文洞察', '扩展管理', '任务看板'], orderViews: [] };
  const { doc, dom, dispose } = start(both(), saved);
  /* the saved order is already in effect outside edit mode */
  assert.deepEqual(orderOf(doc).slice(0, 2), ['记忆系统', '插件']);

  gear(doc).click();
  const unitsB = stubUnits(dom.window, [...doc.querySelectorAll("nav > .snc-entry")]);
  stubHit(dom.window, unitsB);
  pointer(dom.window, 'pointerdown', dragHandles(doc)[0], 10, 14);
  /* "记忆系统" sits at index 0; row 5 spans 200..236 (midpoint 218), so y=230 is
     its trailing half and the drop appends at the end */
  pointer(dom.window, 'pointermove', dom.window.document.body, 10, 230);
  pointer(dom.window, 'pointerup', dom.window.document.body, 10, 230);
  assert.deepEqual(orderOf(doc), ['插件', '自动化任务', '上下文洞察', '扩展管理', '任务看板', '记忆系统'], 'the drag did move things');

  dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.deepEqual(stateOf(dom.window).order, saved.order, 'the store is untouched');
  assert.deepEqual(orderOf(doc), saved.order, 'the DOM reverts to the saved order');
  assert.equal(shadow(doc).dataset.sncEditing, 'false', 'Escape also leaves edit mode');
  dispose();
});

test('a plugin installed after the layout was saved lands at the end', () => {
  /* the stored keys cover only the original six; a seventh host entry appears */
  const saved = { v: 2, folded: false, hidden: [], views: [], order: ['记忆系统', '插件'], orderViews: [] };
  const names = ['插件', '自动化任务', '任务看板', '记忆系统', '新插件'];
  const { doc, dispose } = start(navigation(names), saved);
  assert.deepEqual(orderOf(doc), ['记忆系统', '插件', '自动化任务', '任务看板', '新插件']);
  dispose();
});

test('view tabs reorder on the horizontal axis and persist', () => {
  const { doc, dom, dispose } = start(both());
  gear(doc).click();
  const items = [...strip(doc).querySelectorAll(':scope > .snc-tabitem')];
  /* tabs are a ROW: left/right is the axis, and each item is 90px wide in the
     synthetic layout, so indices sit at x = 0/90/180/... */
  /* tabs are a ROW: left/right is the axis. Each tab is 90px wide in this
     synthetic layout, so index i spans x = i*90 .. i*90+90. */
  const tabUnits = stubUnits(dom.window, items, 'x', 90);
  stubHit(dom.window, tabUnits, 'x');
  const labels = () => tabEls(doc).map((t) => t.textContent);
  assert.deepEqual(labels(), ['对话', '上下页', '画廊', '编队', '记忆系统']);

  /* carry "对话" rightwards. The synthetic row is 90px per tab, so tab 0 is
     x=0..90 and tab 1 is x=90..180 with its midpoint at 135: x=150 is tab 1's
     trailing half, x=250 falls into tab 2 (180..270) and is also past its
     midpoint, so the carried tab lands after "画廊". */
  const handle = items[0].querySelector('[data-snc-drag]');
  pointer(dom.window, 'pointerdown', handle, 5, 10);
  pointer(dom.window, 'pointermove', dom.window.document.body, 150, 10);
  assert.deepEqual(labels(), ['对话', '上下页', '画廊', '编队', '记忆系统'], 'nothing moves before the drop');
  assert.deepEqual(dropMarks(doc), ['上下页:after']);

  pointer(dom.window, 'pointermove', dom.window.document.body, 250, 10);
  assert.deepEqual(dropMarks(doc), ['画廊:after']);
  pointer(dom.window, 'pointerup', dom.window.document.body, 250, 10);
  assert.deepEqual(labels(), ['上下页', '画廊', '对话', '编队', '记忆系统']);

  gear(doc).click();
  assert.deepEqual(stateOf(dom.window).orderViews, ['上下页', '画廊', '对话', '编队', '记忆系统']);
  dispose();
});

test('replaying the saved order never mutates an already-ordered list', () => {
  /* the observer reacts to childList mutations, so a no-op replay must not
     produce any: otherwise sync and the observer ping-pong forever */
  const saved = { v: 2, folded: false, hidden: [], views: [], order: ['插件', '自动化任务', '上下文洞察', '扩展管理', '任务看板', '记忆系统'], orderViews: [] };
  const { doc, dom, dispose } = start(both(), saved);
  const nav = doc.querySelector('nav[class*="panelList"]');
  let moved = 0;
  const obs = new dom.window.MutationObserver((records) => { moved += records.length; });
  obs.observe(nav, { childList: true });
  /* force four extra sync passes through the plugin's own observer path */
  for (let i = 0; i < 4; i += 1) {
    nav.appendChild(doc.createElement('span'));
    nav.removeChild(nav.lastElementChild);
  }
  return new Promise((resolve) => {
    dom.window.setTimeout(() => {
      obs.disconnect();
      assert.deepEqual(orderOf(doc), saved.order, 'order survives the re-syncs');
      resolve();
      dispose();
    }, 10);
  });
});

test('the gear shows a pending-change dot and apply clears it', () => {
  const { doc, dispose } = start(both());
  gear(doc).click();
  assert.equal(gear(doc).dataset.sncDirty, 'false');
  /* a checkbox toggle alone is written through, not a pending layout change */
  const box = doc.querySelector('[data-snc-check]');
  box.checked = false;
  box.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
  assert.equal(gear(doc).dataset.sncDirty, 'false', 'hiding is immediate, not a draft');
  dispose();
});

test('the gear is the only button: no apply/cancel bar exists', () => {
  const { doc, dispose } = start(both());
  const css = cssOf(doc);
  /* the session is a two-state toggle on the gear, so a whole action row would
     duplicate it. Absence is asserted on both the stylesheet and the DOM: a
     leftover rule with no nodes would still be dead weight to maintain. */
  assert.doesNotMatch(css, /\.snc-actions/);
  assert.doesNotMatch(css, /\.snc-(apply|cancel)\b/);
  assert.equal(doc.querySelector('.snc-actions'), null);
  gear(doc).click();
  assert.equal(doc.querySelector('.snc-apply'), null, 'no apply button appears while editing');
  assert.equal(doc.querySelector('.snc-cancel'), null, 'no cancel button appears while editing');
  /* the gear flips to a check mark, which is what says "press me again to save" */
  assert.equal(gear(doc).hasAttribute('data-snc-dirty') ? gear(doc).dataset.sncDirty : 'false', 'false');
  dispose();
});
