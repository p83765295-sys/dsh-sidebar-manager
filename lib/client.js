window.__ModuleLoader__.load({
  id: 'dsh-sidebar-nav-collapse',
  factory: () => {
    const module = { exports: {} };
    /* one versioned record holds every preference: folding, the hidden
       sidebar rows and the hidden view tabs */
    const STORE_STATE = 'dsh-sidebar-nav-collapse:state';
    const STATE_VERSION = 2;
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

/* ---- reorder: handles appear only while editing ----
   The handle is a sibling of the host row/tab inside OUR wrapper, never a
   child of it: a nested element would swallow the click that selects the
   panel or the view. Reordering itself is always generic dragend + a real
   DOM move, so it keeps working if the host renames its classes again. */
.snc-drag {
  flex: 0 0 auto;
  display: none;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 20px;
  color: var(--dsw-alias-label-tertiary, #81858c);
  cursor: grab;
  /* the browser must not treat a press on the handle as a text selection or a
     native image drag; both would steal the pointer stream mid-drag */
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
.snc-drag:active { cursor: grabbing; }
.snc-shell[data-snc-editing="true"] .snc-entry > .snc-drag,
div[data-conversation-tabs][data-snc-editing="true"] > .snc-tabitem > .snc-drag { display: inline-flex; }

/* the row being carried: dimmed, because the insertion bar – not the row
   itself – is what tells you where it will land */
.snc-entry[data-snc-dragging="true"],
.snc-tabitem[data-snc-dragging="true"] {
  opacity: .4;
  cursor: grabbing;
}
/* insertion bar. Driven by the drop side computed on the hovered row, so the
   layout never changes during the drag: nothing reflows, nothing can chatter
   across a midpoint, and the only thing that moves is the cursor. */
.snc-entry[data-snc-drop="before"]::before,
.snc-entry[data-snc-drop="after"]::after,
.snc-tabitem[data-snc-drop="before"]::before,
.snc-tabitem[data-snc-drop="after"]::after {
  content: "";
  position: absolute;
  border-radius: 2px;
  background: var(--dsw-alias-brand-primary, #2b6cf6);
  pointer-events: none;
}
.snc-entry[data-snc-drop], .snc-tabitem[data-snc-drop] { position: relative; }
/* sidebar is a column → horizontal bar above or below the hovered row */
nav[class*="panelList"] > .snc-entry[data-snc-drop="before"]::before,
nav[class*="panelList"] > .snc-entry[data-snc-drop="after"]::after {
  left: 6px;
  right: 6px;
  height: 2px;
}
nav[class*="panelList"] > .snc-entry[data-snc-drop="before"]::before { top: -2px; }
nav[class*="panelList"] > .snc-entry[data-snc-drop="after"]::after { bottom: -2px; }
/* tab strip is a row → vertical bar left or right of the hovered tab */
div[data-conversation-tabs] > .snc-tabitem[data-snc-drop="before"]::before,
div[data-conversation-tabs] > .snc-tabitem[data-snc-drop="after"]::after {
  top: 2px;
  bottom: 2px;
  width: 2px;
}
div[data-conversation-tabs] > .snc-tabitem[data-snc-drop="before"]::before { left: -8px; }
div[data-conversation-tabs] > .snc-tabitem[data-snc-drop="after"]::after { right: -8px; }
/* every unit animates its own transform, which is what makes the swap after a
   drop read as motion rather than as a jump */
.snc-entry,
.snc-tabitem {
  transition: transform .16s var(--ds-ease-in-out, cubic-bezier(.4,0,.2,1)),
              opacity .16s ease;
}
nav[class*="panelList"][data-snc-sorting="true"] > .snc-entry,
div[data-conversation-tabs][data-snc-sorting="true"] > .snc-tabitem {
  will-change: transform;
}

/* The edit session is toggled by the gear itself and commits on the way out:
   there is no separate apply/cancel bar. A pending change is shown on the gear
   instead, so the state stays visible without spending a whole row on it. */
.snc-gear[data-snc-dirty="true"]::after {
  content: '';
  position: absolute;
  right: 4px;
  top: 4px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary, #2b6cf6);
}
.snc-gear { position: relative; }
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
    /* two columns of three dots: the conventional drag affordance, at the size
       of the checkbox it sits next to */
    const GRIP = '<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">' +
      '<circle cx="3" cy="3.5" r="1.15"/><circle cx="7" cy="3.5" r="1.15"/>' +
      '<circle cx="3" cy="8" r="1.15"/><circle cx="7" cy="8" r="1.15"/>' +
      '<circle cx="3" cy="12.5" r="1.15"/><circle cx="7" cy="12.5" r="1.15"/></svg>';

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
           write, and it is the only thing read on boot.
           v2 adds the two order lists. They are stored as an array of entry
           KEYS (the host's own labels), never as indices: a plugin installed
           later then simply lands at the end and no existing position shifts. */
        const emptyState = () => ({ v: STATE_VERSION, folded: false, hidden: [], views: [], order: [], orderViews: [] });
        const asStrings = (list) => (Array.isArray(list) ? list.filter((v) => typeof v === 'string') : []);

        /* v1 records are read as-is; the two new lists just arrive empty */
        const readRecord = (parsed) => {
          if (!parsed || typeof parsed !== 'object') return null;
          if (parsed.v !== 1 && parsed.v !== STATE_VERSION) return null;
          return {
            v: STATE_VERSION,
            folded: parsed.folded === true,
            hidden: asStrings(parsed.hidden),
            views: asStrings(parsed.views),
            order: asStrings(parsed.order),
            orderViews: asStrings(parsed.orderViews),
          };
        };

        const loadState = () => {
          const state = emptyState();
          let raw = null;
          try { raw = window.localStorage.getItem(STORE_STATE); } catch {}
          if (raw !== null) {
            try {
              const parsed = readRecord(JSON.parse(raw));
              if (parsed) return parsed;
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
        /* the saved layout, and the one a drag session is building on top of
           it. `editing` only ever shows the draft; nothing reaches the store
           until the user presses apply. */
        let savedOrder = state.order.slice();
        let savedOrderViews = state.orderViews.slice();
        let draftOrder = savedOrder.slice();
        let draftOrderViews = savedOrderViews.slice();
        let folded = state.folded;
        let editing = false;
        let dirty = false;
        const shells = new Set();

        /* every write funnels through here so the sets and the record never
           drift apart, whatever path changed them */
        const commit = () => {
          state.hidden = [...hidden];
          state.views = [...hiddenViews];
          state.folded = folded;
          state.order = savedOrder.slice();
          state.orderViews = savedOrderViews.slice();
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
            for (const handle of [...entry.querySelectorAll(':scope > .snc-drag')]) handle.remove();
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
            const handle = document.createElement('span');
            handle.className = 'snc-drag';
            handle.dataset.sncDrag = '';
            handle.setAttribute('aria-hidden', 'true');
            handle.innerHTML = GRIP;
            const box = document.createElement('input');
            box.type = 'checkbox';
            box.className = 'snc-check';
            box.dataset.sncCheck = '';
            /* handle, then the box, then the row: the grip is the outer edge so
               it never sits between the box and what the box describes */
            entry.append(handle, box, row);
          }
        };

        /* ---- ordering: stored layout replayed onto the live DOM ----
           A saved order is an array of entry keys. Applying it is a sequence of
           real DOM moves (insertBefore), which is exactly what a drag does by
           hand: no host API, so a DSH refactor cannot invalidate it – only a
           rename of the aria-label/textContent the keys are built from can.
           Every replay is a no-op when the DOM is already in order, which is
           what keeps it from re-triggering the MutationObserver: a mutation the
           observer reacts to must never produce another mutation of the same
           kind, or the two ping-pong forever. */
        const applyOrder = (container, items, list) => {
          if (!container || !items || items.length === 0) return false;
          const rank = new Map();
          list.forEach((key, i) => rank.set(key, i));
          /* stable: unknown keys (a plugin installed after the layout was saved)
             keep their natural relative position and land at the end */
          const sorted = items
            .map((el, i) => ({ el, i, r: rank.has(keyOfEl(el)) ? rank.get(keyOfEl(el)) : Number.MAX_SAFE_INTEGER }))
            .sort((a, b) => (a.r - b.r) || (a.i - b.i));
          /* compare against the CURRENT children before touching anything: a
             move of an untouched list would be a pure mutation storm */
          const wanted = sorted.map((s) => s.el);
          const have = [...container.children].filter((c) => wanted.includes(c));
          if (wanted.length === have.length && wanted.every((el, i) => el === have[i])) return false;
          for (const el of wanted) container.append(el);
          return true;
        };
        const keyOfEl = (el) => {
          if (el.tagName === 'BUTTON') return el.getAttribute('role') === 'tab' ? keyOfTab(el) : keyOf(el);
          const inner = el.querySelector('button[class*="panelRow"], button[role="tab"]');
          if (!inner) return '';
          return inner.getAttribute('role') === 'tab' ? keyOfTab(inner) : keyOf(inner);
        };
        /* the wrappers are the movable units; without edit mode there are no
           wrappers, so the raw host children are used instead */
        const unitsOf = (container, kind) => {
          if (kind === 'tabs') {
            const wrapped = [...container.querySelectorAll(':scope > .snc-tabitem')];
            return wrapped.length > 0 ? wrapped : tabsOf(container);
          }
          const wrapped = [...container.querySelectorAll(':scope > .snc-entry')];
          return wrapped.length > 0 ? wrapped : rowsOf(container);
        };
        const replayOrder = (container, kind, list) => {
          if (!container || list.length === 0) return false;
          return applyOrder(container, unitsOf(container, kind), list);
        };

        /* ---- view tabs: matched by label, the host exposes no id on them ---- */
        const tabsOf = (strip) => [...strip.querySelectorAll(':scope > .snc-tabitem > button[role="tab"], :scope > button[role="tab"]')];

        const unwrapTabs = (strip) => {
          for (const item of [...strip.querySelectorAll(':scope > .snc-tabitem')]) {
            for (const handle of [...item.querySelectorAll(':scope > .snc-drag')]) handle.remove();
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
            /* only the handle and the box are added; both are siblings, never
               children, of the host button */
            const handle = document.createElement('span');
            handle.className = 'snc-drag';
            handle.dataset.sncDrag = '';
            handle.setAttribute('aria-hidden', 'true');
            handle.innerHTML = GRIP;
            item.insertBefore(handle, tab);
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
            /* replay after wrapping, so the movable units exist. The pinned view
               is part of the stored list like any other key; it simply has no
               checkbox. */
            replayOrder(strip, 'tabs', editing ? draftOrderViews : savedOrderViews);
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
          gear.dataset.sncDirty = String(dirty);
          const gearLabel = editing
            ? (dirty ? '拖动后可点应用保存' : '完成扩展显示设置')
            : '扩展显示设置';
          gear.setAttribute('aria-label', gearLabel);
          gear.title = gearLabel;
          gear.innerHTML = editing ? CHECK : GEAR;

          if (editing) wrapAll(nav); else unwrapAll(nav);
          /* the order is replayed after the wrappers exist and before the hidden
             state is painted: the two are independent, but unwrapping on exit
             drops the wrappers the order was expressed in, so it has to be
             re-applied to whatever units are current */
          replayOrder(nav, 'panels', editing ? draftOrder : savedOrder);
          for (const row of rowsOf(nav)) {
            const key = keyOf(row);
            const isHidden = hidden.has(key);
            if (isHidden) row.dataset.sncHidden = 'true';
            else row.removeAttribute('data-snc-hidden');
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

        /* ---- edit session as a transaction ----
           Entering edit mode snapshots both orders into a draft. Dragging
           mutates the draft; Apply commits it and leaves, Cancel throws it away
           and re-paints from the saved copy. The checkboxes still write through
           immediately — hiding was always instant and stays instant. */
        const beginSession = () => {
          draftOrder = savedOrder.slice();
          draftOrderViews = savedOrderViews.slice();
          dirty = false;
        };

        const applySession = () => {
          /* read the live DOM, not just the draft: a drag that ended without a
             pointerup (window blur) still left the DOM in the order the user
             sees, and that is what must be saved */
          for (const shell of shells) {
            const keys = unitsOf(shell.nav, 'panels').map(keyOfEl).filter(Boolean);
            if (keys.length > 0) draftOrder = keys;
          }
          const strip = document.querySelector('div[data-conversation-tabs]');
          if (strip) {
            const keys = unitsOf(strip, 'tabs').map(keyOfEl).filter(Boolean);
            if (keys.length > 0) draftOrderViews = keys;
          }
          savedOrder = draftOrder.slice();
          savedOrderViews = draftOrderViews.slice();
          dirty = false;
          editing = false;
          commit();
          paint();
        };

        const cancelSession = () => {
          draftOrder = savedOrder.slice();
          draftOrderViews = savedOrderViews.slice();
          dirty = false;
          editing = false;
          paint();
        };

        /* Escape throws away the in-progress session, which is the only way out
           that does not commit now that the bar is gone. Kept to one key so the
           escape hatch stays discoverable without a button. */
        window.addEventListener('keydown', (event) => {
          if (event.key !== 'Escape' || !editing) return;
          event.preventDefault();
          cancelSession();
        }, true);

        /* ---- drag: pointer events, insertion preview, one commit at drop ----
           The order is NOT changed while the pointer is down. Reordering on
           every pointermove moves the very boxes being compared, so the row
           oscillates across the boundary it just crossed (measured: B,A,C →
           B,C,A → B,A,C on a still pointer). Instead the drag only paints an
           insertion bar on the row under the cursor, and the single reorder
           happens when the pointer is released. Pointer events, not HTML5 DnD:
           DnD would need draggable=true on the host's own button, which we do
           not own and must not mutate, and it is unusable on touch. */
        const drag = { active: null };

        const isTabStrip = (node) =>
          node && node.nodeType === 1 && node.hasAttribute('data-conversation-tabs');

        const unitsIn = (handle) => {
          const unit = handle.parentElement;
          if (!unit) return null;
          const container = unit.parentElement;
          if (!container) return null;
          /* tabs wrap in a span, sidebar rows in a div; both are direct children
             of the container being reordered */
          let selector = null;
          if (unit.classList.contains('snc-tabitem') && isTabStrip(container)) selector = ':scope > .snc-tabitem';
          if (unit.classList.contains('snc-entry') && container.tagName === 'NAV') selector = ':scope > .snc-entry';
          if (!selector) return null;
          const units = [...container.querySelectorAll(selector)];
          return units.length > 0 ? { unit, container, units } : null;
        };

        const clearDropMarks = (container) => {
          if (!container) return;
          for (const el of container.querySelectorAll('[data-snc-drop]')) delete el.dataset.sncDrop;
        };

        /* Which side of the hovered row would the carried row land on?
           The leading half means "before", the trailing half "after" – on the
           column axis (sidebar) that is top/bottom, on the row axis (tabs) it
           is left/right. Reading only the hovered row keeps this stable. */
        const dropSide = (row, axis, x, y) => {
          const r = row.getBoundingClientRect();
          return axis === 'x'
            ? x < r.left + r.width / 2 ? 'before' : 'after'
            : y < r.top + r.height / 2 ? 'before' : 'after';
        };

        const beginDrag = (handle, event) => {
          const found = unitsIn(handle);
          if (!found) return;
          const { unit, container, units } = found;
          /* measured, not assumed: the tab strip is a row, the sidebar list is a
             column, and a future layout change cannot mislead this */
          const axis = isTabStrip(container) ? 'x' : 'y';
          drag.active = {
            unit, container, units, axis, handle,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            moving: false,
            dropRow: null,
            dropSide: null,
          };
          container.dataset.sncSorting = 'true';
          document.body.style.setProperty('cursor', 'grabbing', 'important');
        };

        const rememberOrder = (t) => {
          const keys = (unitsIn(t.handle)?.units || []).map(keyOfEl).filter(Boolean);
          if (keys.length === 0) return;
          if (isTabStrip(t.container)) draftOrderViews = keys;
          else draftOrder = keys;
        };

        const moveDrag = (event) => {
          const t = drag.active;
          if (!t || event.pointerId !== t.pointerId) return;
          const x = event.clientX;
          const y = event.clientY;
          if (!t.moving) {
            /* a few pixels of slop, so a slightly shaky click still selects the
               panel instead of starting a drag */
            if (Math.abs(x - t.startX) < 4 && Math.abs(y - t.startY) < 4) return;
            t.moving = true;
            t.unit.dataset.sncDragging = 'true';
            try { t.handle.setPointerCapture(t.pointerId); } catch {}
          }
          event.preventDefault();

          /* hit-test against the boxes as they currently sit: nothing has been
             reordered, so the answer cannot change on its own */
          const hit = document.elementFromPoint?.(x, y);
          const row = hit?.closest?.(
            t.axis === 'x' ? '.snc-tabitem' : '.snc-entry'
          );
          const inside = row && row !== t.unit && row.parentElement === t.container;
          if (!inside) {
            clearDropMarks(t.container);
            t.dropRow = null;
            t.dropSide = null;
            return;
          }
          const side = dropSide(row, t.axis, x, y);
          if (t.dropRow !== row || t.dropSide !== side) {
            clearDropMarks(t.container);
            row.dataset.sncDrop = side;
            t.dropRow = row;
            t.dropSide = side;
          }
        };

        /* FLIP: measure, reorder, then play every unit from its old position to
           its new one. Cheaper and far less error-prone than animating a
           transform that has to be reconciled with the real layout. */
        const animateUnits = (container, before) => {
          const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
          for (const [unit, rect] of before) {
            if (!unit.isConnected) continue;
            const now = unit.getBoundingClientRect();
            const dx = rect.left - now.left;
            const dy = rect.top - now.top;
            if (!dx && !dy) continue;
            if (reduce || typeof unit.animate !== 'function') continue;
            unit.animate(
              [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'translate(0,0)' }],
              { duration: 200, easing: 'cubic-bezier(.4,0,.2,1)' }
            );
          }
        };

        const endDrag = (event) => {
          const t = drag.active;
          if (!t || (event && event.pointerId !== t.pointerId)) return;
          drag.active = null;
          clearDropMarks(t.container);
          t.container.removeAttribute('data-snc-sorting');
          document.body.style.removeProperty('cursor');
          try { t.handle.releasePointerCapture(t.pointerId); } catch {}
          delete t.unit.dataset.sncDragging;
          if (!t.moving) return;

          /* commit: place the carried row before/after the row it was dropped
             on, then let the units fly from their previous boxes */
          const target = t.dropRow;
          const side = t.dropSide;
          if (target && target.isConnected && target !== t.unit && target.parentElement === t.container) {
            const before = t.units
              .filter((u) => u.isConnected)
              .map((u) => [u, u.getBoundingClientRect()]);
            if (side === 'after') t.container.insertBefore(t.unit, target.nextSibling);
            else t.container.insertBefore(t.unit, target);
            animateUnits(t.container, before);
          }
          rememberOrder(t);
          dirty = true;
          paint();
        };

        const onPointerDown = (event) => {
          const handle = event.target?.closest?.('[data-snc-drag]');
          if (!handle) return;
          if (event.button !== 0 && event.pointerType === 'mouse') return;
          /* the handle lives inside our wrapper, whose sibling is the host
             button; without this the press would also select the panel */
          event.preventDefault();
          event.stopPropagation();
          beginDrag(handle, event);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('pointermove', moveDrag, true);
        document.addEventListener('pointerup', endDrag, true);
        document.addEventListener('pointercancel', endDrag, true);

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
            if (editing) {
              /* the gear wore a tick: pressing it again means "done", which is
                 apply. Cancel is the explicit escape hatch. */
              applySession();
              return;
            }
            editing = true;
            /* editing a folded list hides the result; leave the list open so the
               change is visible. The user can fold again with one click. */
            if (folded) {
              folded = false;
              writeFolded();
            }
            measureInset();
            beginSession();
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
          /* React reconciles the host children back into ITS order on any
             re-render; replay the saved layout afterwards, but never while a
             drag is in flight (that would fight the pointer). */
          if (!drag.active) {
            for (const shell of shells) replayOrder(shell.nav, 'panels', editing ? draftOrder : savedOrder);
            for (const strip of document.querySelectorAll('div[data-conversation-tabs]')) {
              replayOrder(strip, 'tabs', editing ? draftOrderViews : savedOrderViews);
            }
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
          document.removeEventListener('pointerdown', onPointerDown, true);
          document.removeEventListener('pointermove', moveDrag, true);
          document.removeEventListener('pointerup', endDrag, true);
          document.removeEventListener('pointercancel', endDrag, true);
          if (drag.active) {
            drag.active.container?.removeAttribute?.('data-snc-sorting');
            drag.active = null;
          }
          document.body.style.removeProperty('cursor');
          for (const strip of document.querySelectorAll('div[data-conversation-tabs]')) {
            unwrapTabs(strip);
            strip.removeAttribute('data-snc-editing');
            strip.removeAttribute('data-snc-sorting');
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
