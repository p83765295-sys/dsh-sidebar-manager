window.__ModuleLoader__.load({
  id: 'dsh-sidebar-nav-collapse',
  factory: () => {
    const module = { exports: {} };
    /* one versioned record holds every preference: folding, the hidden
       sidebar rows and the hidden view tabs */
    const STORE_STATE = 'dsh-sidebar-nav-collapse:state';
    const STATE_VERSION = 1;
    /* read once, only to migrate away from the pre-version record */
    const STORE_HIDDEN = 'dsh-sidebar-nav-collapse:hidden';
    const STORE_FOLDED = 'dsh-sidebar-nav-collapse:folded';
    const STORE_VIEWS = 'dsh-sidebar-nav-collapse:views';
    const NAME = 'dsh-sidebar-nav-collapse';
    /* the label of our own group row; a host entry with this exact name gets
       the separator treatment */
    const GROUP_NAME = '扩展管理';

    /*
     * The host nav[class*="panelList"] is fully owned by React: it is a plain
     * column flex stack of button.panelRow children with no heading row, and it
     * has no MutationObserver of its own. Inserting our own buttons INTO it is
     * therefore unsafe (a re-render reconciles the children back), so the whole
     * nav is wrapped in a div of ours. The wrapper carries the group row and the
     * gear in normal flow; the nav keeps its own geometry untouched and the
     * wrapper copies its box so the surrounding column layout does not shift.
     *
     * The conversation view tabs live in a DIFFERENT subtree
     * (div[data-conversation-tabs] > button[role=tab]) and are not wrappable:
     * they sit inside the host header grid, so they are hidden through a data
     * attribute on the strip instead. Tabs are matched by their stable text
     * label, because the host renders no id attribute on them.
     *
     * Geometry mirrors the native sidebar tokens read from
     * dsh-client-ui-sidebar/SidebarRoot.module.css:
     *   panelRow  min-height 36px, padding 7px 8px, gap 8px,
     *             radius var(--dsw-radius-md) 12px, margin 0 2px, line-height 22px
     *   panelList column flex, gap 4px, margin-bottom 8px
     *   radius-sm 8px (28x28 icon buttons)
     * Colours come from the live custom properties so light/dark just works.
     */
    const css = `
.snc-shell { display: block; margin-bottom: 8px; }
.snc-shell > nav[class*="panelList"] { margin-bottom: 0; }

/* hidden entries stay in the DOM (checkbox restorable) but leave the flow */
nav[class*="panelList"] > button[class*="panelRow"][data-snc-hidden="true"] { display: none !important; }

/* ---- group row: same box model as a native panelRow ---- */
.snc-group {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  margin: 0 2px;
  padding: 7px 8px;
  border: 0;
  border-radius: var(--dsw-radius-md, 12px);
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font: inherit;
  font-size: 14px;
  line-height: 22px;
  text-align: left;
  cursor: pointer;
  flex: none;
  /* a toggle is a control, not copy: dragging across it must not leave the
     label smeared in a selection highlight */
  -webkit-user-select: none;
  user-select: none;
}
.snc-group:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(38,49,72,.06)); }
.snc-group:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, currentColor); outline-offset: -2px; }
.snc-group[aria-expanded="true"] { background: var(--dsw-alias-interactive-bg-hover, rgba(38,49,72,.06)); }

.snc-glyph {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--dsw-alias-label-secondary, currentColor);
}
.snc-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
}
.snc-chevron {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-tertiary, #81858c);
  transition: transform .15s var(--ds-ease-in-out, ease);
}
.snc-group[aria-expanded="true"] .snc-chevron { transform: rotate(90deg); }

/* ---- a row named exactly like our group ----
   The host really ships an extension called "扩展管理", which lands directly
   under our group row of the same name. Give the pair a hairline rule so they
   read as "heading, then the thing it is named after" instead of one label
   printed twice. */
.snc-shell > nav[class*="panelList"] > button[class*="panelRow"][data-snc-twin="true"],
.snc-shell > nav[class*="panelList"] > .snc-entry:has(> button[data-snc-twin="true"]) {
  position: relative;
  margin-top: 6px;
}
.snc-shell > nav[class*="panelList"] > button[class*="panelRow"][data-snc-twin="true"]::before,
.snc-shell > nav[class*="panelList"] > .snc-entry:has(> button[data-snc-twin="true"])::before {
  content: "";
  position: absolute;
  top: -4px;
  left: 4px;
  right: 4px;
  height: 1px;
  background: var(--dsw-alias-border-l1, rgba(38,49,72,.08));
}

/* ---- gear: mirrors the native iconButton (28x28, radius-sm) ---- */
.snc-gear {
  flex: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  color: var(--dsw-alias-label-secondary, inherit);
  cursor: pointer;
  transition: background .12s ease, color .12s ease;
}
.snc-gear:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(38,49,72,.06)); }
.snc-gear:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, currentColor); outline-offset: -2px; }
.snc-gear[aria-pressed="true"] {
  background: var(--dsw-alias-interactive-bg-active, rgba(38,49,72,.1));
  color: var(--dsw-alias-label-primary, inherit);
}

/* ---- folded: only the group row survives ---- */
.snc-shell[data-snc-folded="true"] > nav[class*="panelList"] { display: none; }

/* ---- edit mode: the sidebar checkbox sits OUTSIDE the host button ----
   a checkbox nested inside button.panelRow would bubble its click into
   the host's selectPanel handler */
.snc-entry {
  display: flex; align-items: center; gap: 8px;
  min-width: 0; width: 100%; box-sizing: border-box;
}
.snc-entry > button[class*="panelRow"] { flex: 1 1 auto; min-width: 0; }
/* a hand-drawn box: the native control ignores theme tokens and looks foreign */
.snc-check {
  appearance: none; -webkit-appearance: none;
  flex: 0 0 auto; display: grid; place-content: center;
  width: 16px; height: 16px; margin: 0 0 0 2px; padding: 0;
  border: 1.5px solid var(--dsw-alias-label-tertiary, rgba(107,118,134,.55));
  border-radius: 4px; background: transparent;
  color: var(--dsw-alias-brand-primary, #2b6cf6);
  cursor: pointer; transition: border-color .12s ease, background .12s ease;
}
.snc-check:hover { border-color: var(--dsw-alias-label-secondary, rgba(107,118,134,.85)); }
.snc-check:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #2b6cf6); outline-offset: 1px; }
.snc-check:checked {
  border-color: var(--dsw-alias-brand-primary, #2b6cf6);
  background: var(--dsw-alias-brand-primary, #2b6cf6);
  color: var(--dsw-alias-label-on-brand, #fff);
}
.snc-check::after {
  content: ''; width: 9px; height: 5px;
  border-left: 1.8px solid currentColor; border-bottom: 1.8px solid currentColor;
  transform: rotate(-45deg) translateY(-1px) scale(0);
  transition: transform .12s ease;
}
.snc-check:checked::after { transform: rotate(-45deg) translateY(-1px) scale(1); }
/* an unchecked entry must stay reachable, otherwise it can never be restored */
.snc-shell[data-snc-editing="true"] > nav[class*="panelList"] > button[class*="panelRow"][data-snc-hidden="true"],
.snc-shell[data-snc-editing="true"] > nav[class*="panelList"] > .snc-entry:has(> button[data-snc-hidden="true"]) {
  display: flex !important;
}
/* editing needs the list back even when it was folded; folding resumes on exit */
.snc-shell[data-snc-editing="true"] > nav[class*="panelList"] { display: flex !important; }
/* a flex column wraps when told to: whatever the viewport leaves is one row
   down instead of clipped off the bottom of the sidebar */
.snc-shell[data-snc-editing="true"] > nav[class*="panelList"] { flex-wrap: wrap !important; }
/* the box gets its own gutter so its centre is not eaten by the row's padding */
.snc-shell[data-snc-editing="true"] .snc-entry { padding-left: var(--snc-inset, 4px); }
/* the hidden row keeps its box while editing, only its look fades */
.snc-shell[data-snc-editing="true"] > nav[class*="panelList"] > .snc-entry:has(> button[data-snc-hidden="true"]) > button[class*="panelRow"] {
  opacity: .45;
}

/* ---- view tabs: the OTHER group, managed from the same gear ----
   The strip is not wrappable, so edit mode draws a checkbox before each tab
   and the strip turns into a wrapping row. Each tab is wrapped in a span so the
   box and the label can be centred on the same flex baseline; the box carries
   an explicit flex:none + margin:auto so the tab's own 9px bottom padding
   (the active underline gap) cannot stretch or push it out of line. */
.snc-tabbox {
  appearance: none; -webkit-appearance: none;
  flex: 0 0 auto; align-self: center;
  display: block; width: 15px; height: 15px; margin: 0; padding: 0;
  border: 1.5px solid var(--dsw-alias-label-tertiary, rgba(107,118,134,.55));
  border-radius: 4px; background: transparent;
  color: var(--dsw-alias-brand-primary, #2b6cf6);
  cursor: pointer;
  transition: border-color .12s ease, background .12s ease;
}
.snc-tabbox:hover { border-color: var(--dsw-alias-label-secondary, rgba(107,118,134,.85)); }
.snc-tabbox:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #2b6cf6); outline-offset: 1px; }
.snc-tabbox:checked {
  border-color: var(--dsw-alias-brand-primary, #2b6cf6);
  background: var(--dsw-alias-brand-primary, #2b6cf6);
  color: var(--dsw-alias-label-on-brand, #fff);
}
/* the tick is centred by hand: the native caret ignores the theme */
.snc-tabbox { position: relative; }
.snc-tabbox::after {
  content: ''; position: absolute; left: 50%; top: 50%;
  width: 7.5px; height: 4px;
  border-left: 1.7px solid currentColor; border-bottom: 1.7px solid currentColor;
  transform: translate(-50%, -60%) rotate(-45deg) scale(0);
  transition: transform .12s ease;
}
.snc-tabbox:checked::after { transform: translate(-50%, -60%) rotate(-45deg) scale(1); }
/* a hidden tab stays in the strip while editing so it can be brought back.
   The label must survive and must look exactly like a hidden sidebar row:
   the same fade, nothing else. Hiding the button outright would leave a bare
   checkbox with nothing to identify it. */
div[data-conversation-tabs][data-snc-editing="true"] { flex-wrap: wrap; gap: 12px 28px; }
div[data-conversation-tabs] > .snc-tabitem > button[role="tab"][data-snc-hidden="true"] {
  opacity: .45;
}
/* outside edit mode there is no wrapper left, so target the tab directly */
div[data-conversation-tabs][data-snc-editing="false"] > button[role="tab"][data-snc-hidden="true"] {
  display: none !important;
}
/* the tab keeps its own underline gutters while editing too: stripping the
   padding above left the active indicator floating against the row edge */
.snc-tabitem {
  display: inline-flex; align-items: center; gap: 6px;
  flex: 0 0 auto; padding-bottom: 9px;
}
.snc-tabitem > button[role="tab"] { padding-bottom: 0; }
`;

    /* 16px stroke glyph, matches the native sidebar.panellist slot size */
    const GLYPH = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<rect x="2" y="2" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.4"/>' +
      '<rect x="9" y="2" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.4"/>' +
      '<rect x="2" y="9" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.4"/>' +
      '<rect x="9" y="9" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.4"/>' +
      '</svg>';
    const CHEVRON = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
      '<path d="M4.5 2.5 8 6l-3.5 3.5" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const GEAR = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<circle cx="8" cy="8" r="2.6" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M8 1.6v1.8M8 12.6v1.8M1.6 8h1.8M12.6 8h1.8M3.5 3.5l1.3 1.3M11.2 11.2l1.3 1.3M12.5 3.5l-1.3 1.3M4.8 11.2l-1.3 1.3" ' +
      'stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const CHECK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M3 8.5 6.2 11.7 13 4.9" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const isPanelList = (node) =>
      node && node.nodeType === 1 && node.tagName === 'NAV' &&
      typeof node.className === 'string' &&
      node.className.includes('panelList') &&
      /^(全局面板|Global panels)$/.test(node.getAttribute('aria-label') || '');

    function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.pluginCss = NAME;
        style.textContent = css;
        document.head.append(style);

        /* ---- state: one versioned record under one key ----
           Three separate keys meant a migration would have to touch three
           places and could leave a half-migrated pair behind. One record with
           a schema version lets a future build reshape the whole thing in one
           write, and it is the only thing read on boot. */
        const emptyState = () => ({ v: STATE_VERSION, folded: false, hidden: [], views: [] });
        const asStrings = (list) => (Array.isArray(list) ? list.filter((v) => typeof v === 'string') : []);

        const loadState = () => {
          const state = emptyState();
          let raw = null;
          try { raw = window.localStorage.getItem(STORE_STATE); } catch {}
          if (raw !== null) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object' && parsed.v === STATE_VERSION) {
                return {
                  v: STATE_VERSION,
                  folded: parsed.folded === true,
                  hidden: asStrings(parsed.hidden),
                  views: asStrings(parsed.views),
                };
              }
            } catch {}
          }
          /* first run after the merge: fold the legacy per-key records in.
             They are left in place (harmless, never read again) so a user who
             rolls the plugin back keeps their layout. */
          try {
            const legacyFolded = window.localStorage.getItem(STORE_FOLDED) === 'true';
            const legacyHidden = window.localStorage.getItem(STORE_HIDDEN);
            const legacyViews = window.localStorage.getItem(STORE_VIEWS);
            state.folded = legacyFolded;
            if (legacyHidden !== null) state.hidden = asStrings(JSON.parse(legacyHidden));
            if (legacyViews !== null) state.views = asStrings(JSON.parse(legacyViews));
          } catch {}
          return state;
        };

        let state = loadState();
        const saveState = () => {
          try { window.localStorage.setItem(STORE_STATE, JSON.stringify(state)); } catch {}
        };

        let hidden = new Set(state.hidden);
        let hiddenViews = new Set(state.views);
        let folded = state.folded;
        let editing = false;
        const shells = new Set();

        /* every write funnels through here so the sets and the record never
           drift apart, whatever path changed them */
        const commit = () => {
          state.hidden = [...hidden];
          state.views = [...hiddenViews];
          state.folded = folded;
          saveState();
        };
        const writeSet = commit;
        const writeFolded = commit;
        /* write the record back once: on a first run this is what materialises
           the migrated layout, so a rollback lands on a real record, not on a
           re-merge of stale legacy keys */
        saveState();

        /* The row's aria-label is the host's own name for the entry and it does
           not contain the glyph slot text; textContent does, and that glyph is
           rendered by whichever plugin owns the entry (dsh-version-checker
           prefixes a star), so a text fallback skips the glyph entirely. */
        const ownText = (el) => {
          const clone = el.cloneNode(true);
          for (const slot of clone.querySelectorAll('[class*="panelGlyph"], [class*="Glyph"]')) slot.remove();
          return (clone.textContent || '').trim();
        };
        const keyOf = (row) => ((row.getAttribute('aria-label') || '').trim() || ownText(row));
        /* a tab carries no id (the host passes only a React key), and its label
           is the only stable thing it renders, so that is its identity */
        const keyOfTab = (tab) => ((tab.textContent || '').trim() || tab.getAttribute('aria-label') || '').trim();
        /* rows live directly in <nav>, or one level deeper once edit mode wraps them */
        const rowsOf = (nav) => [
          ...nav.querySelectorAll(':scope > button[class*="panelRow"]'),
          ...nav.querySelectorAll(':scope > .snc-entry > button[class*="panelRow"]'),
        ];

        const unwrapAll = (nav) => {
          for (const entry of [...nav.querySelectorAll('.snc-entry')]) {
            const row = entry.querySelector('button[class*="panelRow"]');
            if (row) entry.parentNode.insertBefore(row, entry);
            entry.remove();
          }
        };
        const wrapAll = (nav) => {
          for (const row of rowsOf(nav)) {
            if (row.parentElement?.classList?.contains('snc-entry')) continue;
            const entry = document.createElement('div');
            entry.className = 'snc-entry';
            row.parentNode.insertBefore(entry, row);
            const box = document.createElement('input');
            box.type = 'checkbox';
            box.className = 'snc-check';
            box.dataset.sncCheck = '';
            /* the checkbox leads the row: it reads as "this extension is on" */
            entry.append(box, row);
          }
        };

        /* ---- view tabs: matched by label, the host exposes no id on them ---- */
        const tabsOf = (strip) => [...strip.querySelectorAll(':scope > .snc-tabitem > button[role="tab"], :scope > button[role="tab"]')];

        const unwrapTabs = (strip) => {
          for (const item of [...strip.querySelectorAll(':scope > .snc-tabitem')]) {
            const tab = item.querySelector('button[role="tab"]');
            if (tab) strip.insertBefore(tab, item);
            item.remove();
          }
        };
        /* Chat is the host's fallback view (resolveActiveView falls back to it)
           and the only place the input lives, so hiding it can strand the user
           on a blank center. It is therefore not a toggle: no checkbox. */
        const isPinnedTab = (tab) => {
          const id = (tab.getAttribute('data-snc-view-id') || '').toLowerCase();
          if (id) return id === 'chat';
          return /^(对话|聊天|Chat)$/i.test(keyOfTab(tab));
        };

        const wrapTabs = (strip) => {
          for (const tab of tabsOf(strip)) {
            if (tab.parentElement?.classList?.contains('snc-tabitem')) continue;
            /* the box is a sibling of the tab, never its child: a nested input
               would swallow the click that selects the view */
            const item = document.createElement('span');
            item.className = 'snc-tabitem';
            tab.parentNode.insertBefore(item, tab);
            item.append(tab);
            /* a pinned view is wrapped all the same so layout stays uniform,
               it just never receives a checkbox */
            if (isPinnedTab(tab)) continue;
            const box = document.createElement('input');
            box.type = 'checkbox';
            box.className = 'snc-tabbox';
            box.dataset.sncTabCheck = '';
            item.insertBefore(box, tab);
          }
        };

        const paintTabs = () => {
          for (const strip of document.querySelectorAll('div[data-conversation-tabs]')) {
            strip.dataset.sncEditing = String(editing);
            if (editing) wrapTabs(strip); else unwrapTabs(strip);
            for (const tab of tabsOf(strip)) {
              const key = keyOfTab(tab);
              /* the box is the label's other half. React drops our siblings on
                 every re-render (selecting a view re-renders the strip), so a
                 freshly mounted tab would sit bare: re-wrap it here, not only
                 from the observer. */
              if (editing && !tab.parentElement?.classList?.contains('snc-tabitem')) wrapTabs(strip);
              const box = tab.parentElement?.querySelector?.(':scope > [data-snc-tab-check]');
              /* a pinned view must never carry the hidden attribute, even if an
                 older build stored it: reconcile the store once and move on */
              if (isPinnedTab(tab)) {
                if (box) box.remove();
                tab.removeAttribute('data-snc-hidden');
                if (hiddenViews.delete(key)) writeSet();
                continue;
              }
              const isHidden = hiddenViews.has(key);
              if (isHidden) tab.dataset.sncHidden = 'true';
              else tab.removeAttribute('data-snc-hidden');
              /* never let the active view be hidden: the host falls back to
                 chat silently and the click would look like nothing happened */
              if (isHidden && tab.getAttribute('aria-selected') === 'true') {
                tab.removeAttribute('data-snc-hidden');
                hiddenViews.delete(key);
                writeSet();
              }
              if (box) {
                box.checked = !hiddenViews.has(key);
                box.setAttribute('aria-label', key + ' 显示');
                box.title = hiddenViews.has(key) ? '已隐藏，勾选后显示' : '显示中，取消勾选则隐藏';
              }
            }
          }
        };

        const paintShell = (shell) => {
          const { nav, group, gear } = shell;
          shell.el.dataset.sncFolded = String(folded);
          shell.el.dataset.sncEditing = String(editing);
          group.setAttribute('aria-expanded', String(!folded));
          group.setAttribute('aria-label', folded ? '展开扩展管理' : '收起扩展管理');
          group.title = group.getAttribute('aria-label');
          group.querySelector('.snc-chevron').innerHTML = CHEVRON;
          gear.setAttribute('aria-pressed', String(editing));
          const gearLabel = editing ? '完成扩展显示设置' : '扩展显示设置';
          gear.setAttribute('aria-label', gearLabel);
          gear.title = gearLabel;
          gear.innerHTML = editing ? CHECK : GEAR;

          if (editing) wrapAll(nav); else unwrapAll(nav);
          for (const row of rowsOf(nav)) {
            const key = keyOf(row);
            const isHidden = hidden.has(key);
            if (isHidden) row.dataset.sncHidden = 'true';
            else row.removeAttribute('data-snc-hidden');
            /* a row can share the group row's name (the extension literally
               called "扩展管理" sits right under our group of the same name).
               Mark it so the CSS can tell the two apart and drop a rule between
               them: without it the pair reads as one duplicated heading. */
            if (key === GROUP_NAME) row.dataset.sncTwin = 'true';
            else row.removeAttribute('data-snc-twin');
            const box = row.parentElement?.querySelector?.(':scope > [data-snc-check]');
            if (box) {
              box.checked = !isHidden;
              box.setAttribute('aria-label', key + ' 显示');
              box.title = isHidden ? '已隐藏，勾选后显示' : '显示中，取消勾选则隐藏';
            }
          }
          paintTabs();
        };

        const paint = () => { for (const shell of shells) paintShell(shell); };

        const build = (nav) => {
          if (nav.parentElement?.classList?.contains('snc-shell')) return null;
          const el = document.createElement('div');
          el.className = 'snc-shell';

          const group = document.createElement('div');
          group.className = 'snc-group';
          group.setAttribute('role', 'button');
          group.tabIndex = 0;
          group.innerHTML =
            '<span class="snc-glyph">' + GLYPH + '</span>' +
            '<span class="snc-title">' + GROUP_NAME + '</span>' +
            '<span class="snc-chevron">' + CHEVRON + '</span>';

          const gear = document.createElement('button');
          gear.type = 'button';
          gear.className = 'snc-gear';
          gear.dataset.sncSettings = '';
          gear.innerHTML = GEAR;

          const shell = { el, nav, group, gear, style: null };

          /* two column flex stacks share the sidebar root, so a plain 2px inset
             would not line the box up with the native panel rows; measure the
             real indent instead and hand it to the entry through a variable.
             Falls back to the 2px token when nothing else is laid out yet. */
          const measureInset = () => {
            let inset = 2;
            try {
              const neighbours = [...nav.parentElement.children].filter((n) => n !== el && n.getBoundingClientRect().width > 0);
              if (neighbours.length > 0) inset = Math.round(neighbours[0].getBoundingClientRect().left - nav.getBoundingClientRect().left);
            } catch {}
            el.style.setProperty('--snc-inset', inset + 'px');
          };

          group.addEventListener('click', () => {
            folded = !folded;
            writeFolded();
            paint();
          });
          group.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            group.click();
          });
          gear.addEventListener('click', (event) => {
            event.stopPropagation();
            editing = !editing;
            /* editing a folded list hides the result; leave the list open so the
               change is visible. The user can fold again with one click. */
            if (!editing && folded) {
              folded = false;
              writeFolded();
            }
            if (editing) measureInset();
            paint();
          });

          nav.parentNode.insertBefore(el, nav);
          el.append(group, gear, nav);
          return shell;
        };

        const clear = (shell) => {
          unwrapAll(shell.nav);
          /* React may already have dropped the whole wrapper subtree */
          if (shell.el.parentNode && shell.nav.parentElement === shell.el) {
            shell.el.parentNode.insertBefore(shell.nav, shell.el);
          }
          shell.el.remove();
          shells.delete(shell);
        };

        /* the group row owns the gear: it is the last flex child of the row */
        const layoutGroup = (shell) => {
          if (shell.gear.parentElement !== shell.group) shell.group.append(shell.gear);
        };

        const sync = () => {
          /* the strip mounts later than the sidebar and has no shell of its own,
             so every sync pass repaints it instead of relying on build() */
          paintTabs();
          for (const shell of [...shells]) {
            if (!shell.el.isConnected || !shell.nav.isConnected) clear(shell);
          }
          for (const nav of document.querySelectorAll('nav[class*="panelList"]')) {
            if (!isPanelList(nav)) continue;
            const host = nav.parentElement;
            const existing = host?.classList?.contains('snc-shell')
              ? [...shells].find((s) => s.el === host)
              : undefined;
            if (existing) { layoutGroup(existing); continue; }
            const shell = build(nav);
            if (!shell) continue;
            shells.add(shell);
            layoutGroup(shell);
            paintShell(shell);
          }
        };

        /* one delegated handler survives rewrapping and React remounts */
        const onChange = (event) => {
          const panelBox = event.target?.closest?.('[data-snc-check]');
          if (panelBox) {
            const row = panelBox.parentElement?.querySelector?.(':scope > button[class*="panelRow"]');
            if (!row) return;
            const key = keyOf(row);
            if (panelBox.checked) hidden.delete(key); else hidden.add(key);
            writeSet();
            paint();
            return;
          }
          const tabBox = event.target?.closest?.('[data-snc-tab-check]');
          if (tabBox) {
            const tab = tabBox.parentElement?.querySelector?.(':scope > button[role="tab"]');
            if (!tab) return;
            const key = keyOfTab(tab);
            /* hiding the view you are looking at would blank the center area */
            if (!tabBox.checked && tab.getAttribute('aria-selected') === 'true') {
              tabBox.checked = true;
              tabBox.title = '当前视图不能隐藏，请先切到别的标签';
              tabBox.setAttribute('aria-invalid', 'true');
              return;
            }
            if (tabBox.checked) hiddenViews.delete(key); else hiddenViews.add(key);
            writeSet();
            paint();
          }
        };
        document.addEventListener('change', onChange, true);

        sync();
        const observer = new window.MutationObserver(() => {
          sync();
          /* tabs mount later than the sidebar and re-render on selection */
          if (editing || hiddenViews.size > 0) paintTabs();
        });
        observer.observe(document.body, { childList: true, subtree: true, attributeFilter: ['aria-selected'] });
        return () => {
          observer.disconnect();
          document.removeEventListener('change', onChange, true);
          for (const strip of document.querySelectorAll('div[data-conversation-tabs]')) {
            unwrapTabs(strip);
            strip.removeAttribute('data-snc-editing');
          }
          for (const shell of [...shells]) clear(shell);
          style.remove();
        };
      }, 'dsh-sidebar-nav-collapse: panel group + visibility');
    }
    module.exports.apply = apply;
    module.exports.name = 'dsh-sidebar-nav-collapse-client';
    return module.exports;
  }
});
