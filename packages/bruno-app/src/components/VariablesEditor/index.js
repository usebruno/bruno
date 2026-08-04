import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import get from 'lodash/get';
import filter from 'lodash/filter';
import { useDispatch, useSelector } from 'react-redux';
import { findEnvironmentInCollection } from 'utils/collections';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import { usePersistedState } from 'hooks/usePersistedState';
import { usePersistenceScope } from 'hooks/usePersistedState/PersistedScopeProvider';
import { useResizablePanel } from 'hooks/useResizablePanel';
import { STORAGE_PREFIX, STORAGE_SEGMENT } from 'components/CodeEditor/state-persistence';
import VariablesTable from './VariablesTable';
import VariableDetailsDrawer from './VariableDetailsDrawer';
import StyledWrapper from './StyledWrapper';

const MIN_DRAWER_WIDTH = 280;
const DEFAULT_DRAWER_WIDTH = 400;
const DRAWER_MAX_RATIO = 0.6;
const SCROLL_SAVE_DEBOUNCE_MS = 200;
// TableVirtuoso mounts into the shared scroll parent and briefly forces scroll
// to the top (initialTopMostItemIndex=0). Hold the restored position for a
// short window so that reset does not stick.
const SCROLL_RESTORE_GUARD_MS = 400;

const isObjectOrArray = (value) => value !== null && typeof value === 'object';

const secretRevealKey = (section, name) => `${section}:${name}`;

const getScrollEl = (wrapper) => wrapper?.querySelector?.('.flex-boundary') || null;

/** Drop Variables persistence that is tied to a specific environment's values. */
const clearEnvironmentBoundPersistence = (scope) => {
  if (!scope) return;

  localStorage.removeItem(`${STORAGE_PREFIX}${scope}::variables-sort-environment`);

  const editorPrefix = `${STORAGE_PREFIX}${scope}::${STORAGE_SEGMENT}::variables-drawer:environment:`;
  Object.keys(localStorage)
    .filter((key) => key.startsWith(editorPrefix))
    .forEach((key) => localStorage.removeItem(key));
};

const VariablesEditor = ({ collection }) => {
  const dispatch = useDispatch();
  const persistenceScope = usePersistenceScope();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);

  const wrapperRef = useRef(null);
  // Live scroll position. Updated by the scroll listener / explicit captures.
  // Initialized once from persisted state — never overwritten from React state
  // on every render (that wiped values before debounce flushed).
  const scrollPosRef = useRef(null);
  const scrollSaveTimeoutRef = useRef(null);
  const scrollTopZeroTimeoutRef = useRef(null);
  const prevEnvironmentUidRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  // Lifted so masking a secret can close the object drawer.
  const [revealedSecrets, setRevealedSecrets] = useState(() => new Set());

  const [scroll, setScroll] = usePersistedState({ key: 'variables-scroll', default: 0 });

  if (scrollPosRef.current === null) {
    scrollPosRef.current = scroll;
  }

  const [drawerSelection, setDrawerSelection] = usePersistedState({
    key: 'variables-drawer-selection',
    default: null
  });

  const [savedDrawerWidth, setSavedDrawerWidth] = usePersistedState({
    key: 'variables-drawer-width',
    default: DEFAULT_DRAWER_WIDTH
  });

  const activeEnvironmentUid = collection.activeEnvironmentUid ?? null;

  useEffect(() => {
    const prev = prevEnvironmentUidRef.current;
    prevEnvironmentUidRef.current = activeEnvironmentUid;
    if (prev === null || prev === activeEnvironmentUid) return;

    scrollPosRef.current = 0;
    setScroll(0);
    setDrawerSelection(null);
    setRevealedSecrets(new Set());
    const el = getScrollEl(wrapperRef.current);
    if (el) el.scrollTop = 0;

    clearEnvironmentBoundPersistence(persistenceScope);
  }, [activeEnvironmentUid]);

  const runtimeRows = useMemo(() => {
    const runtimeVariables = collection.runtimeVariables || {};
    return Object.entries(runtimeVariables)
      .map(([name, value]) => ({
        uid: `runtime::${name}`,
        name,
        value,
        secret: false
      }))
      .toSorted((a, b) => a.name.localeCompare(b.name));
  }, [collection.runtimeVariables]);

  const environment = findEnvironmentInCollection(collection, activeEnvironmentUid);
  const envRows = useMemo(() => {
    if (!environment) return [];
    const envVars = get(environment, 'variables', []);
    return filter(envVars, (variable) => variable.enabled)
      .map((variable) => ({
        uid: `environment::${variable.name}`,
        name: variable.name,
        value: variable.value,
        secret: !!variable.secret
      }))
      .toSorted((a, b) => a.name.localeCompare(b.name));
  }, [environment]);

  const persistScroll = useCallback((value) => {
    scrollPosRef.current = value;
    setScroll(value);
  }, [setScroll]);

  useLayoutEffect(() => {
    const el = getScrollEl(wrapperRef.current);
    if (!el) return;

    const target = scrollPosRef.current || 0;
    const mountedAt = performance.now();

    const apply = () => {
      el.scrollTop = scrollPosRef.current || 0;
    };

    apply();

    const flushSave = (value) => {
      if (scrollSaveTimeoutRef.current) clearTimeout(scrollSaveTimeoutRef.current);
      scrollSaveTimeoutRef.current = setTimeout(() => {
        setScroll(value);
      }, SCROLL_SAVE_DEBOUNCE_MS);
    };

    const handleScroll = () => {
      const elapsed = performance.now() - mountedAt;
      // While Virtuoso is settling, ignore forced scroll-to-top.
      if (elapsed < SCROLL_RESTORE_GUARD_MS && target > 0 && el.scrollTop < 5) {
        el.scrollTop = target;
        return;
      }

      const top = el.scrollTop;

      // Virtuoso teardown (child layout cleanup runs before ours) often forces
      // the shared parent to 0. If we accepted that immediately we'd persist
      // top and the next visit would start at 0. Debounce accepting "top".
      if (top < 5 && (scrollPosRef.current || 0) > 5) {
        if (scrollTopZeroTimeoutRef.current) clearTimeout(scrollTopZeroTimeoutRef.current);
        scrollTopZeroTimeoutRef.current = setTimeout(() => {
          scrollPosRef.current = el.scrollTop;
          flushSave(scrollPosRef.current);
        }, 75);
        return;
      }

      if (scrollTopZeroTimeoutRef.current) {
        clearTimeout(scrollTopZeroTimeoutRef.current);
        scrollTopZeroTimeoutRef.current = null;
      }

      scrollPosRef.current = top;
      flushSave(top);
    };

    el.addEventListener('scroll', handleScroll);

    let rafId = 0;
    const guard = () => {
      if (performance.now() - mountedAt >= SCROLL_RESTORE_GUARD_MS) return;
      if (target > 0 && Math.abs(el.scrollTop - target) > 1) {
        el.scrollTop = target;
      }
      rafId = requestAnimationFrame(guard);
    };
    rafId = requestAnimationFrame(guard);

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', handleScroll);
      if (scrollSaveTimeoutRef.current) clearTimeout(scrollSaveTimeoutRef.current);
      if (scrollTopZeroTimeoutRef.current) clearTimeout(scrollTopZeroTimeoutRef.current);
      // Persist last known user position from the ref. Do not read el.scrollTop —
      // Virtuoso may already have reset it to 0 during its own unmount.
      setScroll(scrollPosRef.current || 0);
    };
  }, [setScroll, runtimeRows.length, envRows.length]);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const drawerMaxWidth = containerWidth
    ? Math.max(MIN_DRAWER_WIDTH, containerWidth * DRAWER_MAX_RATIO)
    : Number.POSITIVE_INFINITY;

  const { width: drawerWidth, handleDragStart } = useResizablePanel({
    initialWidth: savedDrawerWidth,
    minWidth: MIN_DRAWER_WIDTH,
    maxWidth: drawerMaxWidth,
    direction: 'right',
    onResizeEnd: (newWidth) => setSavedDrawerWidth(newWidth)
  });

  const selectedRow = useMemo(() => {
    if (!drawerSelection?.name || !drawerSelection?.section) return undefined;
    const rows = drawerSelection.section === 'runtime' ? runtimeRows : envRows;
    return rows.find((row) => row.name === drawerSelection.name);
  }, [drawerSelection, runtimeRows, envRows]);

  const selectedValue = selectedRow?.value;

  const toggleSecretReveal = useCallback((section, name) => {
    setRevealedSecrets((prev) => {
      const key = secretRevealKey(section, name);
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!drawerSelection) return;
    if (!selectedRow || !isObjectOrArray(selectedRow.value)) {
      setDrawerSelection(null);
      return;
    }
    // Secret objects must stay masked when the eye is off close the drawer.
    if (
      selectedRow.secret
      && !revealedSecrets.has(secretRevealKey(drawerSelection.section, drawerSelection.name))
    ) {
      setDrawerSelection(null);
    }
  }, [drawerSelection, selectedRow, revealedSecrets, setDrawerSelection]);

  const isDrawerOpen = !!drawerSelection && isObjectOrArray(selectedValue);

  useLayoutEffect(() => {
    const el = getScrollEl(wrapperRef.current);
    if (!el) return;
    el.scrollTop = scrollPosRef.current || 0;
  }, [isDrawerOpen, drawerWidth]);

  const captureScroll = useCallback(() => {
    const el = getScrollEl(wrapperRef.current);
    if (!el) return;
    // Prefer ref (stable across Virtuoso resets) but refresh from DOM if the
    // guard window has passed and the element still has a real offset.
    const value = el.scrollTop > 0 ? el.scrollTop : (scrollPosRef.current || 0);
    persistScroll(value);
  }, [persistScroll]);

  const handleOpenObject = useCallback((selection) => {
    captureScroll();
    setDrawerSelection(selection);
  }, [captureScroll, setDrawerSelection]);

  const handleCloseDrawer = useCallback(() => {
    captureScroll();
    setDrawerSelection(null);
  }, [captureScroll, setDrawerSelection]);

  const handleColumnWidthsChange = useCallback((tableId, widths) => {
    if (!activeTabUid) return;
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId, widths }));
  }, [dispatch, activeTabUid]);

  const runtimeWidths = focusedTab?.tableColumnWidths?.['variables-runtime'] || {};
  const envWidths = focusedTab?.tableColumnWidths?.['variables-env'] || {};

  return (
    <StyledWrapper ref={wrapperRef} data-testid="variables-editor">
      <div className="variables-main">
        <div className="flex-boundary px-4 py-4" data-testid="variables-scroll-container">
          <h1 className="section-title mb-2">Runtime Variables</h1>
          {runtimeRows.length > 0 ? (
            <VariablesTable
              rows={runtimeRows}
              collection={collection}
              section="runtime"
              selectedName={drawerSelection?.section === 'runtime' ? drawerSelection.name : null}
              revealedSecrets={revealedSecrets}
              onToggleSecretReveal={toggleSecretReveal}
              onOpenObject={handleOpenObject}
              columnWidths={runtimeWidths}
              onColumnWidthsChange={(widths) => handleColumnWidthsChange('variables-runtime', widths)}
              objectExpandedStorageKey="variables-object-expanded-runtime"
              testId="variables-runtime-table"
            />
          ) : (
            <div className="muted text-xs mb-4">No runtime variables found</div>
          )}

          <div className="flex items-center mt-6 mb-2">
            <h1 className="section-title">Environment Variables</h1>
            {environment && (
              <span className="muted ml-2 text-xs">({environment.name})</span>
            )}
          </div>

          {!environment ? (
            <div className="muted text-xs">No environment selected</div>
          ) : envRows.length > 0 ? (
            <VariablesTable
              key={activeEnvironmentUid || 'no-env'}
              rows={envRows}
              collection={collection}
              section="environment"
              selectedName={drawerSelection?.section === 'environment' ? drawerSelection.name : null}
              revealedSecrets={revealedSecrets}
              onToggleSecretReveal={toggleSecretReveal}
              onOpenObject={handleOpenObject}
              columnWidths={envWidths}
              onColumnWidthsChange={(widths) => handleColumnWidthsChange('variables-env', widths)}
              objectExpandedStorageKey={`variables-object-expanded-environment:${activeEnvironmentUid || 'none'}`}
              testId="variables-env-table"
            />
          ) : (
            <div className="muted text-xs">No environment variables found</div>
          )}
        </div>
      </div>

      {isDrawerOpen && (
        <div className="details-panel-wrapper" style={{ width: drawerWidth }}>
          <div
            className="details-drag-handle"
            onMouseDown={handleDragStart}
            data-testid="variable-details-drag-handle"
          >
            <div className="drag-border" />
          </div>
          <VariableDetailsDrawer
            collection={collection}
            section={drawerSelection.section}
            name={drawerSelection.name}
            value={selectedValue}
            environmentUid={activeEnvironmentUid}
            onClose={handleCloseDrawer}
          />
        </div>
      )}
    </StyledWrapper>
  );
};

export default VariablesEditor;
