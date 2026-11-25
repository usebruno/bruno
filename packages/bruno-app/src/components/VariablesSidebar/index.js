import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconX } from '@tabler/icons';
import { closeVariablesSidebar } from 'providers/ReduxStore/slices/app';
import { selectActiveTab } from 'src/selectors/tab';
import { useResizablePanel } from 'hooks/useResizablePanel';
import { usePersistedState } from 'hooks/usePersistedState';
import {
  findEnvironmentInCollection,
  findItemInCollection,
  getAvailableAddToScopes,
  getEffectiveActiveEnvironmentUid,
  getGlobalEnvironmentVariables,
  getGlobalEnvironmentVariablesMasked,
  isItemARequest
} from 'utils/collections';
import { resolveFolderScopeTarget } from 'utils/variables';
import { goToVariableDefinition } from 'utils/codemirror/goToVariableDefinition';
import { getLocalStorageValue, setLocalStorageValue } from 'utils/common/localStorage';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import ScopeSection from './ScopeSection';
import ScopeTable from './ScopeTable';
import ObjectView from './ObjectView';
import useVariableActions from './useVariableActions';
import useSidebarScroll from './useSidebarScroll';
import { ADD_TO_SCOPE_ORDER, SCOPE_ICONS, SCOPES } from './constants';
import { countRows, getSidebarSections, getUsedSections, isObjectOrArray, secretRevealKey } from './utils';
import StyledWrapper from './StyledWrapper';

const SIDEBAR_WIDTH_KEY = 'bruno.variablesSidebarWidth';
const DEFAULT_SIDEBAR_WIDTH = 420;
const MIN_SIDEBAR_WIDTH = 340;
const MAX_SIDEBAR_WIDTH = 720;

const readSavedWidth = () => getLocalStorageValue(SIDEBAR_WIDTH_KEY, DEFAULT_SIDEBAR_WIDTH, (value) => {
  const width = parseInt(value, 10);
  return Number.isFinite(width) ? width : DEFAULT_SIDEBAR_WIDTH;
});

const NAVIGATION_SCOPE_INFO = {
  [SCOPES.REQUEST]: (section) => ({ type: 'request', data: { item: section.owner } }),
  [SCOPES.FOLDER]: (section) => ({ type: 'folder', data: { folder: section.owner } }),
  [SCOPES.ENVIRONMENT]: (section) => ({ type: 'environment', data: { environment: section.owner } }),
  [SCOPES.COLLECTION]: () => ({ type: 'collection', data: {} }),
  [SCOPES.GLOBAL]: (section) => ({ type: 'global', data: {}, inheritedFrom: { uid: section.owner.uid } })
};

const EMPTY_REVEALS = new Set();

const toggleKey = (keys, key) => (keys.includes(key) ? keys.filter((entry) => entry !== key) : [...keys, key]);

const VariablesSidebar = ({ collection }) => {
  const dispatch = useDispatch();
  const [initialWidth] = useState(readSavedWidth);
  const [selectedView, setSelectedView] = useState('used');
  const [objectSelection, setObjectSelection] = useState(null);
  const [collapsedUsed, setCollapsedUsed] = usePersistedState({ key: 'variables-sidebar.collapsed.used', default: [] });
  const [collapsedAll, setCollapsedAll] = usePersistedState({ key: 'variables-sidebar.collapsed.all', default: [] });
  const [columnWidths, setColumnWidths] = usePersistedState({ key: 'variables-sidebar.column-widths', default: {} });

  const activeTab = useSelector(selectActiveTab);
  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const activeGlobalEnvironmentUid = useSelector((state) => state.globalEnvironments.activeGlobalEnvironmentUid);

  const environmentsKey = `${getEffectiveActiveEnvironmentUid(collection)}:${activeGlobalEnvironmentUid}`;
  const [reveals, setReveals] = useState(() => ({ environmentsKey, keys: new Set() }));
  if (reveals.environmentsKey !== environmentsKey) {
    setReveals({ environmentsKey, keys: new Set() });
  }
  const revealedSecrets = reveals.environmentsKey === environmentsKey ? reveals.keys : EMPTY_REVEALS;

  const { width, handleDragStart } = useResizablePanel({
    initialWidth,
    minWidth: MIN_SIDEBAR_WIDTH,
    maxWidth: MAX_SIDEBAR_WIDTH,
    direction: 'right',
    onResizeEnd: (newWidth) => setLocalStorageValue(SIDEBAR_WIDTH_KEY, String(newWidth))
  });

  const activeItem = activeTab ? findItemInCollection(collection, activeTab.uid) : null;
  const requestItem = activeItem && isItemARequest(activeItem) ? activeItem : null;
  const view = requestItem ? selectedView : 'all';

  const collectionWithGlobals = useMemo(() => ({
    ...collection,
    globalEnvironments,
    activeGlobalEnvironmentUid,
    globalEnvironmentVariables: getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid }),
    globalEnvSecrets: getGlobalEnvironmentVariablesMasked({ globalEnvironments, activeGlobalEnvironmentUid })
  }), [collection, globalEnvironments, activeGlobalEnvironmentUid]);

  const allSections = useMemo(
    () => getSidebarSections({ collection, item: requestItem, globalEnvironments, activeGlobalEnvironmentUid }),
    [collection, requestItem, globalEnvironments, activeGlobalEnvironmentUid]
  );
  const usedSections = useMemo(
    () => (requestItem ? getUsedSections({ collection: collectionWithGlobals, item: requestItem, sections: allSections }) : []),
    [collectionWithGlobals, requestItem, allSections]
  );
  const sections = view === 'used' ? usedSections : allSections;

  const addToScopes = useMemo(() => {
    const environment = findEnvironmentInCollection(collection, getEffectiveActiveEnvironmentUid(collection));
    const globalEnvironment = (globalEnvironments || []).find((env) => env.uid === activeGlobalEnvironmentUid);
    const { folderScopeTarget } = resolveFolderScopeTarget(collection, requestItem);
    return getAvailableAddToScopes({
      activeEnvironmentUid: environment?.uid,
      activeEnvironmentName: environment?.name,
      activeGlobalEnvironmentUid: globalEnvironment?.uid,
      activeGlobalEnvironmentName: globalEnvironment?.name,
      item: requestItem,
      parentFolder: folderScopeTarget
    }).toSorted((a, b) => ADD_TO_SCOPE_ORDER.indexOf(a.type) - ADD_TO_SCOPE_ORDER.indexOf(b.type));
  }, [collection, requestItem, globalEnvironments, activeGlobalEnvironmentUid]);

  const actions = useVariableActions({ collection, item: requestItem });

  const collapsed = view === 'used' ? collapsedUsed : collapsedAll;
  const setCollapsed = view === 'used' ? setCollapsedUsed : setCollapsedAll;

  const toggleSecretReveal = useCallback((section, name) => {
    const key = secretRevealKey(section, name);
    setReveals((prev) => {
      const next = new Set(prev.keys);
      if (!next.delete(key)) next.add(key);
      return { ...prev, keys: next };
    });
  }, []);

  const isSecretRevealed = useCallback(
    (section, name) => revealedSecrets.has(secretRevealKey(section, name)),
    [revealedSecrets]
  );

  const objectSection = objectSelection ? sections.find((entry) => entry.key === objectSelection.sectionKey) : null;
  const objectRow = objectSection?.rows.find((row) => row.name === objectSelection.name);
  const showObjectView = !!objectRow
    && isObjectOrArray(objectRow.value)
    && (!objectRow.secret || isSecretRevealed(objectSection, objectRow.name));

  const scrollRef = useRef(null);
  const tableRefs = useRef(new Map());
  useSidebarScroll(scrollRef, tableRefs, view);

  const viewTabs = [
    ...(requestItem
      ? [{ key: 'used', label: 'Used in request', indicator: <sup className="font-medium">{countRows(usedSections)}</sup> }]
      : []),
    { key: 'all', label: 'All variables', indicator: <sup className="font-medium">{countRows(allSections)}</sup> }
  ];

  const handleViewChange = (nextView) => {
    setObjectSelection(null);
    setSelectedView(nextView);
  };

  const navigateToScope = (section) => {
    const buildScopeInfo = NAVIGATION_SCOPE_INFO[section.scope];
    return buildScopeInfo
      ? () => goToVariableDefinition(buildScopeInfo(section), collection, requestItem)
      : undefined;
  };

  const renderSections = () => {
    if (sections.length === 0) {
      return (
        <div className="empty-note" data-testid="variables-sidebar-empty">
          {view === 'used' ? 'This request does not use any variables' : 'No variables available'}
        </div>
      );
    }

    return sections.map((section) => (
      <ScopeSection
        key={section.key}
        icon={SCOPE_ICONS[section.scope]}
        sectionKey={section.key}
        title={section.title}
        pill={section.pill}
        count={section.rows.length}
        isDanger={section.scope === SCOPES.UNDEFINED}
        expanded={!collapsed.includes(section.key)}
        onToggle={() => setCollapsed((prev) => toggleKey(prev, section.key))}
        onTitleClick={navigateToScope(section)}
        testId={`variables-sidebar-${section.key}-section`}
      >
        <ScopeTable
          section={section}
          tableRef={(table) => (table ? tableRefs.current.set(section.key, table) : tableRefs.current.delete(section.key))}
          collection={collectionWithGlobals}
          item={requestItem}
          addToScopes={addToScopes}
          columnWidths={columnWidths}
          onColumnWidthsChange={setColumnWidths}
          isSecretRevealed={isSecretRevealed}
          onToggleSecretReveal={toggleSecretReveal}
          onOpenObject={setObjectSelection}
          actions={actions}
        />
      </ScopeSection>
    ));
  };

  return (
    <StyledWrapper style={{ width }} data-testid="variables-sidebar">
      <div
        className="variables-sidebar-resize-handle"
        data-testid="variables-sidebar-resize-handle"
        onMouseDown={handleDragStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize variables sidebar"
      >
        <div className="drag-border" />
      </div>
      <div className="variables-sidebar">
        <div className="variables-sidebar-header">
          <span className="header-title">Variables</span>
          <button
            type="button"
            className="icon-btn"
            onClick={() => dispatch(closeVariablesSidebar())}
            title="Close"
            aria-label="Close variables sidebar"
            data-testid="variables-sidebar-close"
          >
            <IconX size={14} />
          </button>
        </div>
        <div className="variables-sidebar-body">
          <div className="variables-sidebar-tabs" data-testid="variables-sidebar-tabs">
            <ResponsiveTabs tabs={viewTabs} activeTab={view} onTabSelect={handleViewChange} />
          </div>
          <div className="variables-sidebar-content">
            <div
              ref={scrollRef}
              className={`variables-sidebar-scroll${showObjectView ? ' is-covered' : ''}`}
              data-testid={`variables-sidebar-${view}`}
            >
              {renderSections()}
            </div>
            {showObjectView && (
              <div className="object-view-overlay">
                <ObjectView
                  section={objectSection}
                  row={objectRow}
                  collection={collectionWithGlobals}
                  onBack={() => setObjectSelection(null)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default VariablesSidebar;
