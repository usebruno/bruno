import { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconCategory,
  IconBox,
  IconChevronDown,
  IconRun,
  IconEye,
  IconSettings,
  IconDots,
  IconEdit,
  IconX,
  IconCheck,
  IconFolder,
  IconUpload,
  IconFileCode,
  IconFileOff,
  IconCode,
  IconAppWindow,
  IconTransform,
  IconStars
} from '@tabler/icons';
import OpenAPISyncIcon from 'components/Icons/OpenAPISync';
import { switchWorkspace, renameWorkspaceAction, exportWorkspaceAction, confirmWorkspaceCreation, cancelWorkspaceCreation } from 'providers/ReduxStore/slices/workspaces/actions';
import { updateWorkspace } from 'providers/ReduxStore/slices/workspaces';
import { showInFolder } from 'providers/ReduxStore/slices/collections/actions';
import { toggleCollectionFileMode, toggleAppMode } from 'providers/ReduxStore/slices/collections';
import { toggleAiSidebar } from 'providers/ReduxStore/slices/chat';
import MigrateToYmlModal from 'components/CollectionSettings/Overview/Migration/MigrateToYmlModal';
import { findItemInCollection, findItemInCollectionByPathname } from 'utils/collections';
import find from 'lodash/find';
import get from 'lodash/get';
import { addTab, focusTab } from 'providers/ReduxStore/slices/tabs';
import { uuid } from 'utils/common';
import toast from 'react-hot-toast';
import Dropdown from 'components/Dropdown';
import MenuDropdown from 'ui/MenuDropdown';
import CloseWorkspace from 'components/Sidebar/CloseWorkspace';
import CreateWorkspace from 'components/WorkspaceSidebar/CreateWorkspace';
import EnvironmentSelector from 'components/Environments/EnvironmentSelector';
import ToolHint from 'components/ToolHint';
import JsSandboxMode from 'components/SecuritySettings/JsSandboxMode';
import ActionIcon from 'ui/ActionIcon';
import { getRevealInFolderLabel } from 'utils/common/platform';
import { normalizePath } from 'utils/common/path';
import classNames from 'classnames';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';

const MIGRATE_PILL_DISMISSED_KEY = 'bruno.migrateToYmlPill.dismissed';

const readDismissedCollections = () => {
  try {
    const raw = localStorage.getItem(MIGRATE_PILL_DISMISSED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const CollectionHeader = ({ collection, isScratchCollection }) => {
  const dispatch = useDispatch();
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const collections = useSelector((state) => state.collections.collections);
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const preferences = useSelector((state) => state.app.preferences);
  const isAiEnabled = get(preferences, 'ai.enabled', false);
  const isAiSidebarOpen = useSelector((state) => state.chat.isOpen);

  // Get the current active workspace
  const currentWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);
  const gitRootPath = collection?.git?.gitRootPath;

  // Active request (used by the Request / App / File view-mode toggle)
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const activeItem = focusedTab && collection
    ? (findItemInCollection(collection, activeTabUid)
      || (focusedTab.pathname ? findItemInCollectionByPathname(collection, focusedTab.pathname) : null))
    : null;
  const isHttpRequestActive = activeItem?.type === 'http-request';
  const appEnabled = activeItem
    ? (activeItem.draft ? get(activeItem, 'draft.app.enabled', false) : get(activeItem, 'app.enabled', false))
    : false;

  const handleToggleAppMode = (enabled) => {
    if (isHttpRequestActive) {
      dispatch(toggleAppMode({ enabled, itemUid: activeItem.uid, collectionUid: collection.uid }));
    }
  };

  // Workspace rename state
  const [isRenamingWorkspace, setIsRenamingWorkspace] = useState(false);
  const [workspaceNameInput, setWorkspaceNameInput] = useState('');
  const [workspaceNameError, setWorkspaceNameError] = useState('');
  const [closeWorkspaceModalOpen, setCloseWorkspaceModalOpen] = useState(false);
  const [createWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false);
  const [showMigrateModal, setShowMigrateModal] = useState(false);

  // Migrate-to-YML pill dismissal state (persisted by collection pathname)
  const [migratePillDismissed, setMigratePillDismissed] = useState(true);
  useEffect(() => {
    if (!collection?.pathname) return;
    const dismissed = readDismissedCollections();
    setMigratePillDismissed(dismissed.includes(collection.pathname));
  }, [collection?.pathname]);

  const dismissMigratePill = (e) => {
    e?.stopPropagation();
    if (!collection?.pathname) return;
    const dismissed = readDismissedCollections();
    if (!dismissed.includes(collection.pathname)) {
      dismissed.push(collection.pathname);
      try {
        localStorage.setItem(MIGRATE_PILL_DISMISSED_KEY, JSON.stringify(dismissed));
      } catch { }
    }
    setMigratePillDismissed(true);
  };

  const switcherRef = useRef();
  const workspaceActionsRef = useRef();
  const workspaceNameInputRef = useRef(null);
  const workspaceRenameContainerRef = useRef(null);
  const openingAdvancedRef = useRef(false);
  const clickedOutsideRef = useRef(false);
  const handleSaveRef = useRef(null);
  const tempWorkspaceUidRef = useRef(null);
  const isSavingRef = useRef(false);

  const onSwitcherCreate = (ref) => (switcherRef.current = ref);
  const onWorkspaceActionsCreate = (ref) => (workspaceActionsRef.current = ref);

  // Auto-enter rename mode when workspace is newly created
  useEffect(() => {
    if (isScratchCollection && currentWorkspace?.isNewlyCreated) {
      dispatch(updateWorkspace({ uid: currentWorkspace.uid, isNewlyCreated: false }));
      setIsRenamingWorkspace(true);
      setWorkspaceNameInput(currentWorkspace.name || '');
      setWorkspaceNameError('');
    }
  }, [isScratchCollection, currentWorkspace?.isNewlyCreated, currentWorkspace?.uid, currentWorkspace?.name, dispatch]);

  const handleCancelWorkspaceRename = useCallback(() => {
    if (openingAdvancedRef.current) return;
    if (currentWorkspace?.isCreating) {
      dispatch(cancelWorkspaceCreation(currentWorkspace.uid));
      return;
    }
    setIsRenamingWorkspace(false);
    setWorkspaceNameInput('');
    setWorkspaceNameError('');
  }, [currentWorkspace?.isCreating, currentWorkspace?.uid, dispatch]);

  useEffect(() => {
    if (!isRenamingWorkspace) return;

    const handleClickOutside = (event) => {
      if (workspaceRenameContainerRef.current && !workspaceRenameContainerRef.current.contains(event.target)) {
        if (currentWorkspace?.isCreating) {
          clickedOutsideRef.current = true;
          handleSaveRef.current?.();
        } else {
          handleCancelWorkspaceRename();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    const timer = setTimeout(() => {
      workspaceNameInputRef.current?.focus();
      workspaceNameInputRef.current?.select();
    }, 50);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timer);
    };
  }, [isRenamingWorkspace, handleCancelWorkspaceRename, currentWorkspace?.isCreating]);

  const collectionUpdates = useSelector((state) => state.openapiSync?.collectionUpdates || {});
  const { theme } = useTheme();

  if (!collection) {
    return null;
  }

  const hasOpenApiSyncConfigured = collection?.brunoConfig?.openapi?.[0]?.sourceUrl;
  const hasOpenApiUpdates = hasOpenApiSyncConfigured && collectionUpdates[collection.uid]?.hasUpdates;
  const hasOpenApiError = hasOpenApiSyncConfigured && collectionUpdates[collection.uid]?.error;

  // Get mounted collections for the current workspace (excluding scratch collections)
  const mountedCollections = collections.filter((c) => {
    if (c.mountStatus !== 'mounted') return false;

    const isScratch = workspaces.some((w) => w.scratchCollectionUid === c.uid);
    if (isScratch) return false;

    const workspaceCollectionPaths = currentWorkspace?.collections?.map((wc) => wc.path) || [];
    return workspaceCollectionPaths.some((wcPath) => normalizePath(c.pathname) === normalizePath(wcPath));
  });

  // Count tabs for the current collection
  const tabCount = tabs.filter((t) => t.collectionUid === collection.uid).length;

  // Get tab count for a given collection uid
  const getTabCount = (collectionUid) => tabs.filter((t) => t.collectionUid === collectionUid).length;

  // Get tab count for workspace (scratch collection)
  const workspaceTabCount = currentWorkspace?.scratchCollectionUid
    ? getTabCount(currentWorkspace.scratchCollectionUid)
    : 0;

  // Display name and icon based on context
  const displayName = isScratchCollection
    ? (currentWorkspace?.name || 'Untitled Workspace')
    : (collection.name || 'Untitled Collection');

  const DisplayIcon = isScratchCollection ? IconCategory : IconBox;

  // Switcher handlers
  const handleSwitchToWorkspace = (workspaceUid) => {
    switcherRef.current?.hide();
    if (workspaceUid) {
      dispatch(switchWorkspace(workspaceUid));
    }
  };

  const handleSwitchToCollection = (targetCollection) => {
    switcherRef.current?.hide();
    if (!targetCollection?.uid) return;

    const existingTab = tabs.find((t) => t.collectionUid === targetCollection.uid);
    if (existingTab) {
      dispatch(focusTab({ uid: existingTab.uid }));
    } else {
      dispatch(
        addTab({
          uid: targetCollection.uid,
          collectionUid: targetCollection.uid,
          type: 'collection-settings'
        })
      );
    }
  };

  // Collection action handlers
  const handleRun = () => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-runner'
      })
    );
  };

  const viewVariables = () => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'variables'
      })
    );
  };

  const viewCollectionSettings = () => {
    dispatch(
      addTab({
        uid: collection.uid,
        collectionUid: collection.uid,
        type: 'collection-settings'
      })
    );
  };

  const viewOpenApiSync = () => {
    dispatch(addTab({
      uid: uuid(),
      collectionUid: collection.uid,
      type: 'openapi-sync'
    }));
  };

  const handleFileModeClick = () => {
    dispatch(
      toggleCollectionFileMode({
        collectionUid: collection.uid
      })
    );
  };

  // Build overflow menu items for the "..." dropdown
  const overflowMenuItems = [
    { id: 'variables', label: 'Variables', leftSection: IconEye, onClick: viewVariables },
    // File mode is exposed via the Request/App/File view-mode toggle when a request is active;
    // keep it in the overflow as a fallback for non-request contexts.
    ...(!isHttpRequestActive
      ? [{ id: 'file-mode', label: collection.fileMode ? 'Switch to Code Mode' : 'Switch to File Mode', leftSection: collection.fileMode ? IconFileOff : IconFileCode, onClick: handleFileModeClick }]
      : []),
    ...(!hasOpenApiSyncConfigured
      ? [{ id: 'openapi-sync', label: 'OpenAPI', leftSection: OpenAPISyncIcon, onClick: viewOpenApiSync }]
      : []),
    { id: 'collection-settings', label: 'Collection Settings', leftSection: IconSettings, onClick: viewCollectionSettings }
  ];

  // Workspace action handlers (only used when isScratchCollection is true)
  const handleRenameWorkspaceClick = () => {
    workspaceActionsRef.current?.hide();
    setIsRenamingWorkspace(true);
    setWorkspaceNameInput(currentWorkspace?.name || '');
    setWorkspaceNameError('');
  };

  const handleCloseWorkspaceClick = () => {
    workspaceActionsRef.current?.hide();
    if (currentWorkspace?.type === 'default') {
      toast.error('Cannot close the default workspace');
      return;
    }
    setCloseWorkspaceModalOpen(true);
  };

  const handleShowInFolder = () => {
    workspaceActionsRef.current?.hide();
    const pathname = currentWorkspace?.pathname;
    if (pathname) {
      dispatch(showInFolder(pathname)).catch(() => {
        toast.error('Error opening the folder');
      });
    }
  };

  const handleExportWorkspace = () => {
    workspaceActionsRef.current?.hide();
    const uid = currentWorkspace?.uid;
    if (!uid) return;

    dispatch(exportWorkspaceAction(uid))
      .then((result) => {
        if (!result?.canceled) {
          toast.success('Workspace exported successfully');
        }
      })
      .catch((error) => {
        toast.error(error?.message || 'Error exporting workspace');
      });
  };

  const validateWorkspaceName = (name) => {
    const trimmed = name?.trim();
    if (!trimmed) {
      return 'Name is required';
    }
    if (trimmed.length > 255) {
      return 'Must be 255 characters or less';
    }
    return null;
  };

  const handleSaveWorkspaceRename = () => {
    const fromOutside = clickedOutsideRef.current;
    clickedOutsideRef.current = false;

    if (openingAdvancedRef.current) return;
    if (isSavingRef.current) return;

    const trimmedName = workspaceNameInput?.trim();
    if (!trimmedName) {
      if (fromOutside && currentWorkspace?.isCreating) {
        dispatch(cancelWorkspaceCreation(currentWorkspace.uid));
        return;
      }
      setWorkspaceNameError('Name is required');
      return;
    }

    const error = validateWorkspaceName(workspaceNameInput);
    if (error) {
      setWorkspaceNameError(error);
      if (fromOutside && currentWorkspace?.isCreating) {
        dispatch(cancelWorkspaceCreation(currentWorkspace.uid));
      }
      return;
    }

    const uid = currentWorkspace?.uid;
    if (!uid) return;

    isSavingRef.current = true;

    if (currentWorkspace?.isCreating) {
      dispatch(confirmWorkspaceCreation(uid, trimmedName))
        .then(() => {
          setIsRenamingWorkspace(false);
          setWorkspaceNameInput('');
          setWorkspaceNameError('');
          toast.success('Workspace created!');
        })
        .catch((err) => {
          toast.error(err?.message || 'An error occurred while creating the workspace');
        })
        .finally(() => {
          isSavingRef.current = false;
        });
    } else {
      dispatch(renameWorkspaceAction(uid, workspaceNameInput))
        .then(() => {
          toast.success('Workspace renamed!');
          setIsRenamingWorkspace(false);
          setWorkspaceNameInput('');
          setWorkspaceNameError('');
        })
        .catch((err) => {
          toast.error(err?.message || 'An error occurred while renaming the workspace');
          setWorkspaceNameError(err?.message || 'Failed to rename workspace');
        })
        .finally(() => {
          isSavingRef.current = false;
        });
    }
  };

  // Keep ref in sync so click-outside handler always has the latest save logic
  handleSaveRef.current = handleSaveWorkspaceRename;

  const handleWorkspaceNameChange = (e) => {
    setWorkspaceNameInput(e.target.value);
    if (workspaceNameError) {
      setWorkspaceNameError('');
    }
  };

  const handleWorkspaceNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveWorkspaceRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelWorkspaceRename();
    }
  };

  const handleOpenAdvancedCreate = () => {
    openingAdvancedRef.current = true;
    tempWorkspaceUidRef.current = currentWorkspace?.isCreating ? currentWorkspace.uid : null;
    setCreateWorkspaceModalOpen(true);
  };

  const handleAdvancedCreateClose = () => {
    openingAdvancedRef.current = false;
    setCreateWorkspaceModalOpen(false);
    setIsRenamingWorkspace(false);
    setWorkspaceNameInput('');
    setWorkspaceNameError('');
    const tempUid = tempWorkspaceUidRef.current;
    tempWorkspaceUidRef.current = null;
    // Clean up the temp workspace (cancelWorkspaceCreation only switches to default
    // if the temp workspace was still active, so this is safe after modal success too)
    if (tempUid) {
      dispatch(cancelWorkspaceCreation(tempUid));
    }
  };

  // Check if workspace actions should be shown
  const showWorkspaceActions = isScratchCollection
    && currentWorkspace
    && currentWorkspace.type !== 'default'
    && !isRenamingWorkspace;

  const handleDisplayIconClick = (e) => {
    const uid = isScratchCollection ? `${collection.uid}-overview` : collection.uid;
    const type = isScratchCollection ? 'workspaceOverview' : 'collection-settings';
    dispatch(addTab({
      uid: uid,
      collectionUid: collection.uid,
      type: type
    }));
  };

  return (
    <StyledWrapper>
      {closeWorkspaceModalOpen && currentWorkspace?.uid && (
        <CloseWorkspace
          workspaceUid={currentWorkspace.uid}
          onClose={() => setCloseWorkspaceModalOpen(false)}
        />
      )}

      {createWorkspaceModalOpen && (
        <CreateWorkspace onClose={handleAdvancedCreateClose} />
      )}

      <div className="flex items-center justify-between gap-2 py-2 px-4">
        {/* Left side: Switcher dropdown or rename input */}
        <div className="collection-switcher">
          {isRenamingWorkspace ? (
            <div className="workspace-rename-container" ref={workspaceRenameContainerRef}>
              <DisplayIcon size={18} strokeWidth={1.5} className="cursor-pointer display-icon" />
              <div className="workspace-input-wrapper">
                <input
                  ref={workspaceNameInputRef}
                  type="text"
                  className="workspace-name-input"
                  value={workspaceNameInput}
                  onChange={handleWorkspaceNameChange}
                  onKeyDown={handleWorkspaceNameKeyDown}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                {currentWorkspace?.isCreating && (
                  <button
                    className="cog-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleOpenAdvancedCreate}
                    title="Advanced options"
                  >
                    <IconSettings size={13} strokeWidth={1.5} />
                  </button>
                )}
              </div>
              <div className="inline-actions">
                <button
                  className="inline-action-btn save"
                  onClick={handleSaveWorkspaceRename}
                  onMouseDown={(e) => e.preventDefault()}
                  title={currentWorkspace?.isCreating ? 'Create' : 'Save'}
                >
                  <IconCheck size={14} strokeWidth={2} />
                </button>
                <button
                  className="inline-action-btn cancel"
                  onClick={handleCancelWorkspaceRename}
                  onMouseDown={(e) => e.preventDefault()}
                  title="Cancel"
                >
                  <IconX size={14} strokeWidth={2} />
                </button>
              </div>
              {workspaceNameError && (
                <span className="workspace-error">{workspaceNameError}</span>
              )}
            </div>
          ) : (
            <div className="flex flex-row justify-center items-center gap-x-1">
              <DisplayIcon size={18} strokeWidth={1.5} className="cursor-pointer display-icon" onClick={handleDisplayIconClick} />
              <Dropdown
                placement="bottom-start"
                onCreate={onSwitcherCreate}
                appendTo={() => document.body}
                icon={(
                  <button className="switcher-trigger">
                    <span className={classNames('switcher-name', { 'scratch-collection': isScratchCollection })}>{displayName}</span>
                    <IconChevronDown size={14} strokeWidth={1.5} className="chevron" />
                  </button>
                )}
              >
                <div className="max-w-124 overflow-hidden">
                  {currentWorkspace && (
                    <>
                      <div className="label-item">Workspace</div>
                      <div
                        className={classNames('dropdown-item', {
                          'dropdown-item-active': isScratchCollection
                        })}
                        onClick={() => handleSwitchToWorkspace(currentWorkspace.uid)}
                      >
                        <div className="dropdown-icon">
                          <IconCategory size={16} strokeWidth={1.5} />
                        </div>
                        <span className="dropdown-label collection-header-dropdown-label">
                          {currentWorkspace.name || 'Untitled Workspace'}
                        </span>
                        {workspaceTabCount > 0 && (
                          <span className="dropdown-tab-count">{workspaceTabCount}</span>
                        )}
                      </div>
                    </>
                  )}

                  {mountedCollections.length > 0 && (
                    <>
                      <div className="dropdown-separator" />
                      <div className="label-item">Collections</div>
                      {mountedCollections.map((col) => {
                        const colTabCount = getTabCount(col.uid);
                        return (
                          <div
                            key={col.uid}
                            className={classNames('dropdown-item', {
                              'dropdown-item-active': !isScratchCollection && collection.uid === col.uid
                            })}
                            onClick={() => handleSwitchToCollection(col)}
                          >
                            <div className="dropdown-icon">
                              <IconBox size={16} strokeWidth={1.5} />
                            </div>
                            <span className="dropdown-label collection-header-dropdown-label">{col.name || 'Untitled Collection'}</span>
                            {colTabCount > 0 && (
                              <span className="dropdown-tab-count">{colTabCount}</span>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </Dropdown>
            </div>
          )}

          {/* Workspace actions dropdown */}
          {showWorkspaceActions && (
            <Dropdown
              placement="bottom-start"
              onCreate={onWorkspaceActionsCreate}
              appendTo={() => document.body}
              icon={<IconDots size={18} strokeWidth={1.5} className="workspace-actions-trigger" />}
            >
              <div className="dropdown-item" onClick={handleRenameWorkspaceClick}>
                <div className="dropdown-icon">
                  <IconEdit size={16} strokeWidth={1.5} />
                </div>
                <span>Rename</span>
              </div>
              <div className="dropdown-item" onClick={handleShowInFolder}>
                <div className="dropdown-icon">
                  <IconFolder size={16} strokeWidth={1.5} />
                </div>
                <span>{getRevealInFolderLabel()}</span>
              </div>
              <div className="dropdown-item" onClick={handleExportWorkspace}>
                <div className="dropdown-icon">
                  <IconUpload size={16} strokeWidth={1.5} />
                </div>
                <span>Export</span>
              </div>
              <div className="dropdown-item" onClick={handleCloseWorkspaceClick}>
                <div className="dropdown-icon">
                  <IconX size={16} strokeWidth={1.5} />
                </div>
                <span>Close</span>
              </div>
            </Dropdown>
          )}
        </div>

        <div className="flex flex-grow gap-1.5 items-center justify-end">
          {!isScratchCollection && (
            <>
              {isHttpRequestActive && (
                <div className="mode-toggle" data-testid="view-mode-toggle">
                  <ToolHint text="Request" toolhintId="ViewModeRequestToolhintId" place="bottom">
                    <button
                      type="button"
                      data-testid="view-mode-request"
                      aria-label="Request view"
                      className={`mode-btn ${!appEnabled && !collection.fileMode ? 'active' : ''}`}
                      onClick={() => {
                        if (collection.fileMode) handleFileModeClick();
                        if (appEnabled) handleToggleAppMode(false);
                      }}
                    >
                      <IconCode size={16} strokeWidth={1.5} />
                    </button>
                  </ToolHint>
                  <ToolHint text="App" toolhintId="ViewModeAppToolhintId" place="bottom">
                    <button
                      type="button"
                      data-testid="view-mode-app"
                      aria-label="App view"
                      className={`mode-btn ${appEnabled && !collection.fileMode ? 'active' : ''}`}
                      onClick={() => {
                        if (collection.fileMode) handleFileModeClick();
                        if (!appEnabled) handleToggleAppMode(true);
                      }}
                    >
                      <IconAppWindow size={16} strokeWidth={1.5} />
                    </button>
                  </ToolHint>
                  <ToolHint text="File" toolhintId="ViewModeFileToolhintId" place="bottom">
                    <button
                      type="button"
                      data-testid="view-mode-file"
                      aria-label="File view"
                      className={`mode-btn ${collection.fileMode ? 'active' : ''}`}
                      onClick={() => {
                        if (appEnabled) handleToggleAppMode(false);
                        if (!collection.fileMode) handleFileModeClick();
                      }}
                    >
                      <IconFileCode size={16} strokeWidth={1.5} />
                    </button>
                  </ToolHint>
                </div>
              )}
              {isAiEnabled && (
                <ToolHint text="AI Assistant" toolhintId="AiAssistantToolhintId" place="bottom">
                  <ActionIcon
                    onClick={() => dispatch(toggleAiSidebar())}
                    aria-label="AI Assistant"
                    size="sm"
                    data-testid="ai-assistant"
                    className={isAiSidebarOpen ? 'active' : ''}
                  >
                    <IconStars size={16} strokeWidth={1.5} />
                  </ActionIcon>
                </ToolHint>
              )}
              {collection.format === 'bru' && !migratePillDismissed && (
                <div
                  className="migrate-yml-pill"
                  data-testid="migrate-yml-pill"
                  title="Migrate this collection to YML"
                >
                  <button
                    type="button"
                    className="pill-main"
                    onClick={() => setShowMigrateModal(true)}
                  >
                    <IconTransform size={13} strokeWidth={1.5} />
                    <span className="pill-label">Migrate to YML</span>
                  </button>
                  <button
                    type="button"
                    className="pill-dismiss"
                    onClick={dismissMigratePill}
                    aria-label="Dismiss"
                    data-testid="migrate-yml-pill-dismiss"
                  >
                    <IconX size={12} strokeWidth={2} />
                  </button>
                </div>
              )}
              {/* OpenAPI Sync - standalone only when configured and beta enabled */}
              {hasOpenApiSyncConfigured && (
                <ToolHint
                  text={hasOpenApiError ? 'OpenAPI Error' : hasOpenApiUpdates ? 'OpenAPI Updates Available' : 'OpenAPI'}
                  toolhintId="OpenApiSyncToolhintId"
                  place="bottom"
                >
                  <ActionIcon onClick={viewOpenApiSync} aria-label="OpenAPI" size="sm" className="relative">
                    <OpenAPISyncIcon size={15} />
                    {(hasOpenApiUpdates || hasOpenApiError) && (
                      <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hasOpenApiError ? theme.status.danger.text : theme.status.warning.text }} />
                    )}
                  </ActionIcon>
                </ToolHint>
              )}
              {/* Runner - always visible */}
              <ToolHint text="Runner" toolhintId="RunnerToolhintId" place="bottom">
                <ActionIcon onClick={handleRun} aria-label="Runner" size="sm" data-testid="runner">
                  <IconRun size={16} strokeWidth={1.5} />
                </ActionIcon>
              </ToolHint>
              {/* JS Sandbox Mode - always visible */}
              <JsSandboxMode collection={collection} />
              {/* Overflow menu */}
              <MenuDropdown items={overflowMenuItems} placement="bottom-end" data-testid="more-actions">
                <ActionIcon label="More actions" size="sm" style={{ border: `1px solid ${theme.border.border1}`, borderRadius: theme.border.radius.base, width: 24, marginRight: 4, marginLeft: 4 }}>
                  <IconDots size={16} strokeWidth={1.5} />
                </ActionIcon>
              </MenuDropdown>
              {/* Environment Selector - always visible */}
              <span>
                <EnvironmentSelector collection={collection} />
              </span>
            </>
          )}
        </div>
      </div>
      {showMigrateModal && (
        <MigrateToYmlModal
          collection={collection}
          onClose={() => setShowMigrateModal(false)}
        />
      )}
    </StyledWrapper>
  );
};

export default CollectionHeader;
