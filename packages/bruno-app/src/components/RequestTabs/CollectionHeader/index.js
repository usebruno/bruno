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
  IconRefresh
} from '@tabler/icons';
import { switchWorkspace, renameWorkspaceAction, exportWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { showInFolder } from 'providers/ReduxStore/slices/collections/actions';
import { addTab, focusTab } from 'providers/ReduxStore/slices/tabs';
import { uuid } from 'utils/common';
import toast from 'react-hot-toast';
import Dropdown from 'components/Dropdown';
import CloseWorkspace from 'components/Sidebar/CloseWorkspace';
import EnvironmentSelector from 'components/Environments/EnvironmentSelector';
import ToolHint from 'components/ToolHint';
import JsSandboxMode from 'components/SecuritySettings/JsSandboxMode';
import ActionIcon from 'ui/ActionIcon';
import { getRevealInFolderLabel } from 'utils/common/platform';
import classNames from 'classnames';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';

const CollectionHeader = ({ collection, isScratchCollection }) => {
  const dispatch = useDispatch();
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const collections = useSelector((state) => state.collections.collections);
  const tabs = useSelector((state) => state.tabs.tabs);

  // Get the current active workspace
  const currentWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

  // Workspace rename state
  const [isRenamingWorkspace, setIsRenamingWorkspace] = useState(false);
  const [workspaceNameInput, setWorkspaceNameInput] = useState('');
  const [workspaceNameError, setWorkspaceNameError] = useState('');
  const [closeWorkspaceModalOpen, setCloseWorkspaceModalOpen] = useState(false);

  const switcherRef = useRef();
  const workspaceActionsRef = useRef();
  const workspaceNameInputRef = useRef(null);
  const workspaceRenameContainerRef = useRef(null);

  const onSwitcherCreate = (ref) => (switcherRef.current = ref);
  const onWorkspaceActionsCreate = (ref) => (workspaceActionsRef.current = ref);

  const handleCancelWorkspaceRename = useCallback(() => {
    setIsRenamingWorkspace(false);
    setWorkspaceNameInput('');
    setWorkspaceNameError('');
  }, []);

  useEffect(() => {
    if (!isRenamingWorkspace) return;

    const handleClickOutside = (event) => {
      if (workspaceRenameContainerRef.current && !workspaceRenameContainerRef.current.contains(event.target)) {
        handleCancelWorkspaceRename();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRenamingWorkspace, handleCancelWorkspaceRename]);

  const collectionUpdates = useSelector((state) => state.openapiSync?.collectionUpdates || {});
  const { theme } = useTheme();

  if (!collection) {
    return null;
  }

  const hasOpenApiSync = collection?.brunoConfig?.openapi?.sync?.sourceUrl;
  const hasOpenApiUpdates = hasOpenApiSync && collectionUpdates[collection.uid]?.hasUpdates;
  const hasOpenApiError = hasOpenApiSync && collectionUpdates[collection.uid]?.error;

  // Get mounted collections for the current workspace (excluding scratch collections)
  const mountedCollections = collections.filter((c) => {
    if (c.mountStatus !== 'mounted') return false;

    const isScratch = workspaces.some((w) => w.scratchCollectionUid === c.uid);
    if (isScratch) return false;

    const workspaceCollectionPaths = currentWorkspace?.collections?.map((wc) => wc.path) || [];
    return workspaceCollectionPaths.some((wcPath) => c.pathname === wcPath);
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

  // Workspace action handlers (only used when isScratchCollection is true)
  const handleRenameWorkspaceClick = () => {
    workspaceActionsRef.current?.hide();
    setIsRenamingWorkspace(true);
    setWorkspaceNameInput(currentWorkspace?.name || '');
    setWorkspaceNameError('');
    setTimeout(() => {
      workspaceNameInputRef.current?.focus();
      workspaceNameInputRef.current?.select();
    }, 50);
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
    const error = validateWorkspaceName(workspaceNameInput);
    if (error) {
      setWorkspaceNameError(error);
      return;
    }

    const uid = currentWorkspace?.uid;
    if (!uid) return;

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
      });
  };

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

  // Check if workspace actions should be shown
  const showWorkspaceActions = isScratchCollection
    && currentWorkspace
    && currentWorkspace.type !== 'default'
    && !isRenamingWorkspace;

  return (
    <StyledWrapper>
      {closeWorkspaceModalOpen && currentWorkspace?.uid && (
        <CloseWorkspace
          workspaceUid={currentWorkspace.uid}
          onClose={() => setCloseWorkspaceModalOpen(false)}
        />
      )}

      <div className="flex items-center justify-between gap-2 py-2 px-4">
        {/* Left side: Switcher dropdown or rename input */}
        <div className="collection-switcher">
          {isRenamingWorkspace ? (
            <div className="workspace-rename-container" ref={workspaceRenameContainerRef}>
              <DisplayIcon size={18} strokeWidth={1.5} />
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
              <div className="inline-actions">
                <button
                  className="inline-action-btn save"
                  onClick={handleSaveWorkspaceRename}
                  onMouseDown={(e) => e.preventDefault()}
                  title="Save"
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
            <Dropdown
              placement="bottom-start"
              onCreate={onSwitcherCreate}
              appendTo={() => document.body}
              icon={(
                <button className="switcher-trigger">
                  <DisplayIcon size={18} strokeWidth={1.5} />
                  <span className="switcher-name">{displayName}</span>
                  {tabCount > 0 && <span className="tab-count">{tabCount}</span>}
                  <IconChevronDown size={14} strokeWidth={1.5} className="chevron" />
                </button>
              )}
            >
              {/* Workspace section */}
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
                    <span className="dropdown-label">
                      {currentWorkspace.name || 'Untitled Workspace'}
                    </span>
                    {workspaceTabCount > 0 && (
                      <span className="dropdown-tab-count">{workspaceTabCount}</span>
                    )}
                  </div>
                </>
              )}

              {/* Collections section */}
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
                        <span className="dropdown-label">{col.name || 'Untitled Collection'}</span>
                        {colTabCount > 0 && (
                          <span className="dropdown-tab-count">{colTabCount}</span>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </Dropdown>
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

        {/* Right side: Actions (only for regular collections) */}
        {!isScratchCollection && (
          <div className="flex flex-grow gap-1 items-center justify-end">
            <ToolHint
              text={hasOpenApiError ? 'OpenAPI Sync Error' : hasOpenApiUpdates ? 'OpenAPI Updates Available' : 'OpenAPI Sync'}
              toolhintId="OpenApiSyncToolhintId"
              place="bottom"
            >
              <ActionIcon onClick={viewOpenApiSync} aria-label="OpenAPI Sync" size="sm" className="relative">
                <IconRefresh size={16} strokeWidth={1.5} />
                {(hasOpenApiUpdates || hasOpenApiError) && (
                  <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hasOpenApiError ? theme.status.danger.text : theme.status.warning.text }} />
                )}
              </ActionIcon>
            </ToolHint>
            <ToolHint text="Runner" toolhintId="RunnerToolhintId" place="bottom">
              <ActionIcon onClick={handleRun} aria-label="Runner" size="sm">
                <IconRun size={16} strokeWidth={1.5} />
              </ActionIcon>
            </ToolHint>
            <ToolHint text="Variables" toolhintId="VariablesToolhintId">
              <ActionIcon onClick={viewVariables} aria-label="Variables" size="sm">
                <IconEye size={16} strokeWidth={1.5} />
              </ActionIcon>
            </ToolHint>
            <ToolHint text="Collection Settings" toolhintId="CollectionSettingsToolhintId">
              <ActionIcon onClick={viewCollectionSettings} aria-label="Collection Settings" size="sm">
                <IconSettings size={16} strokeWidth={1.5} />
              </ActionIcon>
            </ToolHint>
            <JsSandboxMode collection={collection} />
            <span className="ml-2">
              <EnvironmentSelector collection={collection} />
            </span>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default CollectionHeader;
