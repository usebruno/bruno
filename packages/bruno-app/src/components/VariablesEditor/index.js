import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import get from 'lodash/get';
import filter from 'lodash/filter';
import { IconBolt, IconDatabase } from '@tabler/icons';
import { useDispatch, useSelector } from 'react-redux';
import { getDataTypeFromValue } from '@usebruno/common/utils';
import { findEnvironmentInCollection } from 'utils/collections';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import { usePersistedState } from 'hooks/usePersistedState';
import { usePersistenceScope } from 'hooks/usePersistedState/PersistedScopeProvider';
import { useResizablePanel } from 'hooks/useResizablePanel';
import { getScopedStorageKey } from 'components/CodeEditor/state-persistence';
import VariablesTable from './VariablesTable';
import VariablesSection from './VariablesSection';
import VariableDetailsDrawer from './VariableDetailsDrawer';
import {
  DEFAULT_DRAWER_WIDTH,
  DRAWER_MAX_RATIO,
  MIN_DRAWER_WIDTH,
  SCROLL_RESTORE_GUARD_MS,
  SCROLL_SAVE_DEBOUNCE_MS
} from './constants';
import StyledWrapper from './StyledWrapper';

const isObjectOrArray = (value) => getDataTypeFromValue(value) === 'object';

/** Persisted-reveal key. Owned here — VariablesTable asks via isSecretRevealed. */
const secretRevealKey = (section, name) => `${section}:${name}`;

const getScrollEl = (wrapper) => wrapper?.querySelector?.('.variables-scroll') || null;

/** Drop Variables persistence that is tied to a specific environment's values. */
const clearEnvironmentBoundPersistence = (scope) => {
  if (!scope) return;

  const prefixes = [
    getScopedStorageKey(scope, 'variables-drawer:environment:'),
    getScopedStorageKey(scope, 'variables-cell:environment:')
  ];
  Object.keys(localStorage)
    .filter((key) => prefixes.some((prefix) => key.startsWith(prefix)))
    .forEach((key) => localStorage.removeItem(key));
};

const VariablesEditor = ({ collection }) => {
  const dispatch = useDispatch();
  const persistenceScope = usePersistenceScope();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);

  const wrapperRef = useRef(null);
  const scrollSaveTimeoutRef = useRef(null);
  const scrollTopZeroTimeoutRef = useRef(null);
  const prevEnvironmentUidRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  // Persisted as an array Set does not JSON round-trip.
  const [revealedSecretsList, setRevealedSecretsList] = usePersistedState({
    key: 'variables-revealed-secrets',
    default: []
  });
  const revealedSecrets = useMemo(
    () => new Set(Array.isArray(revealedSecretsList) ? revealedSecretsList : []),
    [revealedSecretsList]
  );

  const [scroll, setScroll] = usePersistedState({ key: 'variables-scroll', default: 0 });

  // Persisted as an array of the collapsed sections.
  const [collapsedSections, setCollapsedSections] = usePersistedState({
    key: 'variables-collapsed-sections',
    default: []
  });

  // Live scroll position, seeded once from persistence. Kept in a ref so a
  // debounced save can't be clobbered by a re-render.
  const scrollPosRef = useRef(scroll);

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
    setRevealedSecretsList((prev) =>
      (Array.isArray(prev) ? prev : []).filter((key) => !String(key).startsWith('environment:'))
    );
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
        uid: variable.uid,
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
  }, [setScroll]);

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

  const toggleSection = useCallback((section) => {
    setCollapsedSections((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.includes(section) ? list.filter((s) => s !== section) : [...list, section];
    });
  }, [setCollapsedSections]);

  const isSectionExpanded = useCallback(
    (section) => !(Array.isArray(collapsedSections) ? collapsedSections : []).includes(section),
    [collapsedSections]
  );

  const toggleSecretReveal = useCallback((section, name) => {
    const key = secretRevealKey(section, name);
    setRevealedSecretsList((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
    });
  }, [setRevealedSecretsList]);

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

  // Opening/closing the drawer reflows both tables; re-assert the position.
  // Deliberately not keyed on drawerWidth — that changes on every drag frame.
  useLayoutEffect(() => {
    const el = getScrollEl(wrapperRef.current);
    if (!el) return;
    el.scrollTop = scrollPosRef.current || 0;
  }, [isDrawerOpen]);

  const captureScroll = useCallback(() => {
    const el = getScrollEl(wrapperRef.current);
    if (!el) return;
    // Prefer ref (stable across Virtuoso resets) but refresh from DOM if the
    // guard window has passed and the element still has a real offset.
    persistScroll(el.scrollTop > 0 ? el.scrollTop : (scrollPosRef.current || 0));
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

  const handleRuntimeWidthsChange = useCallback(
    (widths) => handleColumnWidthsChange('variables-runtime', widths),
    [handleColumnWidthsChange]
  );
  const handleEnvWidthsChange = useCallback(
    (widths) => handleColumnWidthsChange('variables-env', widths),
    [handleColumnWidthsChange]
  );

  const isSecretRevealed = useCallback(
    (section, name) => revealedSecrets.has(secretRevealKey(section, name)),
    [revealedSecrets]
  );

  const runtimeWidths = focusedTab?.tableColumnWidths?.['variables-runtime'] || {};
  const envWidths = focusedTab?.tableColumnWidths?.['variables-env'] || {};

  return (
    <StyledWrapper ref={wrapperRef} data-testid="variables-editor">
      <div className="variables-main">
        <div className="variables-scroll" data-testid="variables-scroll-container">
          <VariablesSection
            icon={IconBolt}
            title="Runtime Variables"
            count={runtimeRows.length}
            expanded={isSectionExpanded('runtime')}
            onToggle={() => toggleSection('runtime')}
            testId="variables-runtime-section"
          >
            {runtimeRows.length > 0 ? (
              <VariablesTable
                rows={runtimeRows}
                collection={collection}
                section="runtime"
                selectedName={drawerSelection?.section === 'runtime' ? drawerSelection.name : null}
                isSecretRevealed={isSecretRevealed}
                onToggleSecretReveal={toggleSecretReveal}
                onOpenObject={handleOpenObject}
                columnWidths={runtimeWidths}
                onColumnWidthsChange={handleRuntimeWidthsChange}
                testId="variables-runtime-table"
              />
            ) : (
              <div className="muted text-xs px-2 py-1">No runtime variables found</div>
            )}
          </VariablesSection>

          <VariablesSection
            icon={IconDatabase}
            title="Environment Variables"
            count={envRows.length}
            subtitle={environment?.name}
            expanded={isSectionExpanded('environment')}
            onToggle={() => toggleSection('environment')}
            testId="variables-env-section"
          >
            {!environment ? (
              <div className="muted text-xs px-2 py-1">No environment selected</div>
            ) : envRows.length > 0 ? (
              <VariablesTable
                key={activeEnvironmentUid || 'no-env'}
                rows={envRows}
                collection={collection}
                section="environment"
                environmentUid={activeEnvironmentUid}
                selectedName={drawerSelection?.section === 'environment' ? drawerSelection.name : null}
                isSecretRevealed={isSecretRevealed}
                onToggleSecretReveal={toggleSecretReveal}
                onOpenObject={handleOpenObject}
                columnWidths={envWidths}
                onColumnWidthsChange={handleEnvWidthsChange}
                testId="variables-env-table"
              />
            ) : (
              <div className="muted text-xs px-2 py-1">No environment variables found</div>
            )}
          </VariablesSection>
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
