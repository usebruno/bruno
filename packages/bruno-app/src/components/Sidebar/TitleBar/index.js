import { useState, forwardRef, useRef, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { IconPlus, IconChevronDown, IconCheck, IconFolder, IconDownload, IconPin, IconPinned, IconHome, IconSearch, IconDeviceDesktop } from '@tabler/icons';

import { showHomePage, savePreferences } from 'providers/ReduxStore/slices/app';
import { openCollection, importCollection } from 'providers/ReduxStore/slices/collections/actions';
import { switchWorkspace, openWorkspaceDialog, importCollectionInWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import { sortWorkspaces, toggleWorkspacePin } from 'utils/workspaces';

import Dropdown from 'components/Dropdown';
import ImportCollection from 'components/Sidebar/ImportCollection';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';
import CreateWorkspace from 'components/WorkspaceSidebar/CreateWorkspace';

import CreateCollection from '../CreateCollection';
import StyledWrapper from './StyledWrapper';

const TitleBar = ({ showSearch, setShowSearch }) => {
  const dispatch = useDispatch();
  const { ipcRenderer } = window;

  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const preferences = useSelector((state) => state.app.preferences);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

  // Sort workspaces according to preferences
  const sortedWorkspaces = useMemo(() => {
    return sortWorkspaces(workspaces, preferences);
  }, [workspaces, preferences]);

  const [importedCollection, setImportedCollection] = useState(null);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);
  const [importType, setImportType] = useState(null);
  const [createWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false);

  const toTitleCase = (str) => {
    if (!str) return '';
    if (str === 'default') return 'Default';
    return str
      .split(/[\s-_]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleImportCollection = ({ rawData, type, environment }) => {
    setImportedCollection(rawData);
    setImportType(type);
    setImportCollectionModalOpen(false);

    if (activeWorkspace) {
      dispatch(importCollectionInWorkspace(rawData, activeWorkspace.uid, undefined, type))
        .catch((err) => {
          toast.error('An error occurred while importing the collection');
        });
    } else {
      setImportCollectionLocationModalOpen(true);
    }
  };

  const handleImportCollectionLocation = (collectionLocation, selectedCollections) => {
    const isMultipleImport = importType && (importType === 'multiple' || importType === 'bulk');
    const collectionsToImport = !isMultipleImport ? importedCollection : importedCollection.filter((collection) =>
      selectedCollections.includes(collection.uid));

    const collectionsArray = Array.isArray(collectionsToImport) ? collectionsToImport : [collectionsToImport];
    if (collectionsArray.length === 0 || (collectionsArray.length === 1 && !collectionsArray[0])) {
      toast.error('Please select at least one collection to import.');
      return;
    }

    setImportCollectionLocationModalOpen(false);

    if (activeWorkspace) {
      dispatch(importCollectionInWorkspace(collectionsToImport, activeWorkspace.uid, collectionLocation))
        .catch((err) => {
          console.error(err);
          toast.error('An error occurred while importing the collection');
        });
    } else {
      dispatch(importCollection(collectionsToImport, collectionLocation));
    }
  };

  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const workspaceDropdownTippyRef = useRef();
  const onWorkspaceDropdownCreate = (ref) => (workspaceDropdownTippyRef.current = ref);

  const actionsDropdownTippyRef = useRef();
  const onActionsDropdownCreate = (ref) => (actionsDropdownTippyRef.current = ref);

  const WorkspaceName = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="workspace-name-container" onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}>
        <span className="workspace-name">{toTitleCase(activeWorkspace?.name) || 'Default Workspace'}</span>
        <IconChevronDown size={14} stroke={1.5} className="chevron-icon" />
      </div>
    );
  });

  const handleToggleSearch = () => {
    if (setShowSearch) {
      setShowSearch((prev) => !prev);
    }
  };

  const handleWorkspaceSwitch = (workspaceUid) => {
    dispatch(switchWorkspace(workspaceUid));
    setShowWorkspaceDropdown(false);
    toast.success(`Switched to ${workspaces.find((w) => w.uid === workspaceUid)?.name}`);
  };

  const handleOpenWorkspace = async () => {
    setShowWorkspaceDropdown(false);
    try {
      await dispatch(openWorkspaceDialog());
      toast.success('Workspace opened successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to open workspace');
    }
  };

  const handleCreateWorkspace = () => {
    setShowWorkspaceDropdown(false);
    setCreateWorkspaceModalOpen(true);
  };

  const handlePinWorkspace = useCallback((workspaceUid, e) => {
    e.preventDefault();
    e.stopPropagation();
    const newPreferences = toggleWorkspacePin(workspaceUid, preferences);
    dispatch(savePreferences(newPreferences));
  }, [dispatch, preferences]);

  const handleOpenCollection = () => {
    const options = {};
    if (activeWorkspace?.pathname) {
      options.workspaceId = activeWorkspace.pathname;
    }

    dispatch(openCollection(options)).catch((err) => {
      toast.error('An error occurred while opening the collection');
    });
  };

  const openDevTools = () => {
    ipcRenderer.invoke('renderer:open-devtools');
  };

  const renderModals = () => (
    <>
      {createCollectionModalOpen && (
        <CreateCollection
          onClose={() => setCreateCollectionModalOpen(false)}
          workspaceUid={activeWorkspace?.uid}
          defaultLocation={activeWorkspace?.pathname ? `${activeWorkspace.pathname}/collections` : ''}
          hideLocationInput={!!activeWorkspace?.pathname}
        />
      )}
      {importCollectionModalOpen && (
        <ImportCollection
          onClose={() => setImportCollectionModalOpen(false)}
          handleSubmit={handleImportCollection}
        />
      )}
      {importCollectionLocationModalOpen && (
        <ImportCollectionLocation
          collectionName={Array.isArray(importedCollection) ? importedCollection?.[0]?.name : importedCollection?.name}
          onClose={() => setImportCollectionLocationModalOpen(false)}
          handleSubmit={handleImportCollectionLocation}
        />
      )}
      {createWorkspaceModalOpen && (
        <CreateWorkspace onClose={() => setCreateWorkspaceModalOpen(false)} />
      )}
    </>
  );

  return (
    <StyledWrapper className="px-2 py-2">
      {renderModals()}
      <div className="titlebar-container">

        {/* Workspace Dropdown */}
        <Dropdown
          onCreate={onWorkspaceDropdownCreate}
          icon={<WorkspaceName />}
          placement="bottom-start"
          style="new"
          visible={showWorkspaceDropdown}
          onClickOutside={() => setShowWorkspaceDropdown(false)}
        >
          {sortedWorkspaces.map((workspace) => {
            const isActive = workspace.uid === activeWorkspaceUid;
            const isPinned = preferences?.workspaces?.pinnedWorkspaceUids?.includes(workspace.uid);

            return (
              <div
                key={workspace.uid}
                className={`dropdown-item workspace-item ${isActive ? 'active' : ''}`}
                onClick={() => handleWorkspaceSwitch(workspace.uid)}
              >
                <span className="workspace-name">{toTitleCase(workspace.name)}</span>
                <div className="workspace-actions">
                  {workspace.type !== 'default' && (
                    <button
                      className={`pin-btn ${isPinned ? 'pinned' : ''}`}
                      onClick={(e) => handlePinWorkspace(workspace.uid, e)}
                      title={isPinned ? 'Unpin workspace' : 'Pin workspace'}
                    >
                      {isPinned ? (
                        <IconPinned size={14} stroke={1.5} />
                      ) : (
                        <IconPin size={14} stroke={1.5} />
                      )}
                    </button>
                  )}
                  {isActive && <IconCheck size={16} stroke={1.5} className="check-icon" />}
                </div>
              </div>
            );
          })}

          <div className="label-item border-top">Workspaces</div>

          <div className="dropdown-item" onClick={handleCreateWorkspace}>
            <IconPlus size={16} stroke={1.5} className="icon" />
            Create workspace
          </div>
          <div className="dropdown-item" onClick={handleOpenWorkspace}>
            <IconFolder size={16} stroke={1.5} className="icon" />
            Open workspace
          </div>
        </Dropdown>

        {/* Search and Actions */}
        <div className="actions-container">
          <button className="home-icon-button" onClick={() => dispatch(showHomePage())} title="Home">
            <IconHome size={16} stroke={1.5} />
          </button>

          {setShowSearch && (
            <button className="search-icon-button" onClick={handleToggleSearch} title="Toggle search">
              <IconSearch size={16} stroke={1.5} />
            </button>
          )}

          <Dropdown
            onCreate={onActionsDropdownCreate}
            icon={(
              <button className="plus-icon-button">
                <IconPlus size={16} stroke={1.5} />
              </button>
            )}
            placement="bottom-end"
            style="new"
          >
            <div className="label-item">Collections</div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                setCreateCollectionModalOpen(true);
                actionsDropdownTippyRef.current?.hide();
              }}
            >
              <IconPlus size={16} stroke={1.5} className="icon" />
              Create collection
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                actionsDropdownTippyRef.current?.hide();
                setImportCollectionModalOpen(true);
              }}
            >
              <IconDownload size={16} stroke={1.5} className="icon" />
              Import collection
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                handleOpenCollection();
                actionsDropdownTippyRef.current?.hide();
              }}
            >
              <IconFolder size={16} stroke={1.5} className="icon" />
              Open collection
            </div>
            <div className="dropdown-separator"></div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                actionsDropdownTippyRef.current?.hide();
                openDevTools();
              }}
            >
              <IconDeviceDesktop size={16} stroke={1.5} className="icon" />
              Devtools
            </div>
          </Dropdown>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default TitleBar;
