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

function start(html = navigation(), storedHidden, storedFolded) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, { url: 'http://localhost/' });
  if (storedHidden !== undefined) dom.window.localStorage.setItem('dsh-sidebar-nav-collapse:hidden', storedHidden);
  if (storedFolded !== undefined) dom.window.localStorage.setItem('dsh-sidebar-nav-collapse:folded', storedFolded);
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
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const cssOf = (doc) => doc.querySelector('style[data-plugin-css="dsh-sidebar-nav-collapse"]').textContent;
const rows = (doc) => [...doc.querySelectorAll('nav button[class*="panelRow"]')];
const shadow = (doc) => doc.querySelector('.snc-shell');
const group = (doc) => doc.querySelector('.snc-group');
const gear = (doc) => doc.querySelector('.snc-gear');

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
  assert.match(groupRule, /gap:\s*8px/);
  assert.match(groupRule, /border-radius:\s*var\(--dsw-radius-md,\s*12px\)/);
  // gear mirrors the native 28x28 iconButton
  const gearRule = css.slice(css.indexOf('.snc-gear {'), css.indexOf('}', css.indexOf('.snc-gear {')));
  assert.match(gearRule, /width:\s*28px/);
  assert.match(gearRule, /height:\s*28px/);
  assert.match(gearRule, /border-radius:\s*var\(--dsw-radius-sm,\s*8px\)/);
  // no colour is hardcoded: everything is a live theme token with a fallback
  assert.match(gearRule, /--dsw-alias-label-secondary/);
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
  assert.equal(dom.window.localStorage.getItem('dsh-sidebar-nav-collapse:folded'), 'true');

  group(doc).click();
  assert.equal(shell.dataset.sncFolded, 'false');
  assert.equal(dom.window.localStorage.getItem('dsh-sidebar-nav-collapse:folded'), 'false');
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
  const { doc, dispose } = start(undefined, undefined, 'true');
  assert.equal(shadow(doc).dataset.sncFolded, 'true');
  assert.equal(group(doc).getAttribute('aria-expanded'), 'false');
  dispose();
});

test('the gear is inside the group row, at its trailing edge', () => {
  const { doc, dispose } = start();
  assert.equal(gear(doc).parentElement, group(doc), 'gear lives in the group row, not the nav');
  assert.equal(group(doc).lastElementChild, gear(doc), 'gear is the trailing item');
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
    assert.equal(box.parentElement.firstElementChild, box, 'checkbox leads the row');
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
  assert.deepEqual(JSON.parse(dom.window.localStorage.getItem('dsh-sidebar-nav-collapse:hidden')), ['任务看板']);

  gear(doc).click();
  const after = rows(doc).find((r) => r.getAttribute('aria-label') === '任务看板');
  assert.equal(after.dataset.sncHidden, 'true');
  assert.match(cssOf(doc), /\[data-snc-hidden="true"\]\s*\{\s*display:\s*none/);
  dispose();
});

test('hidden extensions stay reachable while editing so they can be restored', () => {
  const { doc, dispose } = start(navigation(), JSON.stringify(['记忆系统']));
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
  const { doc, dispose } = start(undefined, undefined, 'true');
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
  assert.equal(dom.window.localStorage.getItem('dsh-sidebar-nav-collapse:folded'), 'false');
  // the user can fold again right away
  group(doc).click();
  assert.equal(shadow(doc).dataset.sncFolded, 'true');
  dispose();
});

test('survives a sidebar remount and ignores unknown entries', async () => {
  const { doc, dispose } = start(undefined, JSON.stringify(['插件', '早已卸载的插件']));
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
  assert.equal(doc.querySelectorAll('.snc-gear').length, 1);
  dispose();
});

test('host disable restores the DOM completely', async () => {
  const { doc, dispose } = start();
  gear(doc).click();
  assert.equal(doc.querySelectorAll('.snc-entry').length, 6);
  dispose();
  assert.equal(doc.querySelector('.snc-shell'), null);
  assert.equal(doc.querySelector('.snc-gear'), null);
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
