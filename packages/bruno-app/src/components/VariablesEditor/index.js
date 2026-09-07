import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import get from 'lodash/get';
import filter from 'lodash/filter';
import { IconBolt, IconDatabase } from '@tabler/icons';
import { useDispatch, useSelector } from 'react-redux';
import { findEnvironmentInCollection } from 'utils/collections';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import { usePersistedState } from 'hooks/usePersistedState';
import { usePersistenceScope } from 'hooks/usePersistedState/PersistedScopeProvider';
import { useResizablePanel } from 'hooks/useResizablePanel';
import VariablesTable from './VariablesTable';
import VariablesSection from './VariablesSection';
import VariableDetailsDrawer from './VariableDetailsDrawer';
import { DEFAULT_DRAWER_WIDTH, DRAWER_MAX_RATIO, MIN_DRAWER_WIDTH } from './constants';
import { clearEnvironmentBoundPersistence, isObjectOrArray, secretRevealKey } from './utils';
import { useVariablesScroll } from './hooks/useVariablesScroll';
import StyledWrapper from './StyledWrapper';

const VariablesEditor = ({ collection }) => {
  const dispatch = useDispatch();
  const persistenceScope = usePersistenceScope();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);

  const wrapperRef = useRef(null);
  const prevEnvironmentUidRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [revealedSecrets, setRevealedSecrets] = useState(() => new Set());

  const [collapsedSections, setCollapsedSections] = usePersistedState({
    key: 'variables-collapsed-sections',
    default: []
  });

  const { captureScroll, reassertScroll, resetScroll } = useVariablesScroll(wrapperRef);

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

    resetScroll();
    setDrawerSelection(null);
    setRevealedSecrets(
      (prev) => new Set([...prev].filter((key) => !key.startsWith('environment:')))
    );

    clearEnvironmentBoundPersistence(persistenceScope);
  }, [activeEnvironmentUid, persistenceScope, resetScroll, setDrawerSelection]);

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
    ? Math.min(containerWidth, Math.max(MIN_DRAWER_WIDTH, containerWidth * DRAWER_MAX_RATIO))
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
    setRevealedSecrets((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!drawerSelection) return;
    if (!selectedRow || !isObjectOrArray(selectedRow.value)) {
      setDrawerSelection(null);
      return;
    }
    // The drawer shows the value unmasked, so hiding a secret again must close it.
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
    reassertScroll();
  }, [isDrawerOpen]);

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
