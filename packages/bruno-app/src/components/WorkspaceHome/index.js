import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconCategory, IconPlus, IconFolders, IconFileImport, IconDots, IconEdit, IconX, IconCheck, IconFolder } from '@tabler/icons';
import { importCollectionInWorkspace, renameWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { showInFolder, openCollection } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import CreateCollection from 'components/Sidebar/CreateCollection';
import ImportCollection from 'components/Sidebar/ImportCollection';
import CloseWorkspace from 'components/Sidebar/SidebarHeader/CloseWorkspace';
import WorkspaceCollections from './WorkspaceCollections';
import WorkspaceDocs from './WorkspaceDocs';
import WorkspaceEnvironments from './WorkspaceEnvironments';
import StyledWrapper from './StyledWrapper';
import Dropdown from 'components/Dropdown';

const WorkspaceHome = () => {
  const dispatch = useDispatch();
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const [activeTab, setActiveTab] = useState('collections');

  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);

  const [isRenamingWorkspace, setIsRenamingWorkspace] = useState(false);
  const [workspaceNameInput, setWorkspaceNameInput] = useState('');
  const [workspaceNameError, setWorkspaceNameError] = useState('');
  const [closeWorkspaceModalOpen, setCloseWorkspaceModalOpen] = useState(false);
  const workspaceNameInputRef = useRef(null);
  const workspaceRenameContainerRef = useRef(null);
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

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
  }, [isRenamingWorkspace]);

  if (!activeWorkspace) {
    return null;
  }

  const handleCreateCollection = async () => {
    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:ensure-collections-folder', activeWorkspace.pathname);
      setCreateCollectionModalOpen(true);
    } catch (error) {
      console.error('Error ensuring collections folder exists:', error);
      toast.error('Error preparing workspace for collection creation');
    }
  };

  const handleOpenCollection = () => {
    dispatch(openCollection())
      .catch((err) => {
        console.error(err);
        toast.error('An error occurred while opening the collection');
      });
  };

  const handleImportCollection = () => {
    setImportCollectionModalOpen(true);
  };

  const handleImportCollectionSubmit = ({ rawData, type, environment, repositoryUrl }) => {
    setImportCollectionModalOpen(false);
    dispatch(importCollectionInWorkspace(rawData, activeWorkspace.uid, undefined, type))
      .catch((err) => {
        console.error(err);
        toast.error('An error occurred while importing the collection');
      });
  };

  // Workspace menu handlers
  const handleRenameWorkspaceClick = () => {
    setIsRenamingWorkspace(true);
    setWorkspaceNameInput(activeWorkspace.name);
    setWorkspaceNameError('');
    setTimeout(() => {
      workspaceNameInputRef.current?.focus();
      workspaceNameInputRef.current?.select();
    }, 50);
  };

  const handleCloseWorkspaceClick = () => {
    dropdownTippyRef.current?.hide();
    if (activeWorkspace.type === 'default') {
      toast.error('Cannot close the default workspace');
      return;
    }
    setCloseWorkspaceModalOpen(true);
  };

  const handleShowInFolder = () => {
    dropdownTippyRef.current?.hide();
    if (activeWorkspace.pathname) {
      dispatch(showInFolder(activeWorkspace.pathname))
        .catch((error) => {
          console.error('Error opening the folder', error);
          toast.error('Error opening the folder');
        });
    }
  };

  const validateWorkspaceName = (name) => {
    if (!name || name.trim() === '') {
      return 'Name is required';
    }

    if (name.length < 1) {
      return 'Must be at least 1 character';
    }

    if (name.length > 255) {
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

    dispatch(renameWorkspaceAction(activeWorkspace.uid, workspaceNameInput))
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

  const handleCancelWorkspaceRename = () => {
    setIsRenamingWorkspace(false);
    setWorkspaceNameInput('');
    setWorkspaceNameError('');
  };

  const handleWorkspaceNameChange = (e) => {
    const value = e.target.value;
    setWorkspaceNameInput(value);

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

  if (!activeWorkspace) {
    return null;
  }

  const tabs = [
    {
      id: 'collections',
      label: 'Collections',
      component: (
        <WorkspaceCollections
          workspace={activeWorkspace}
          onImportCollection={handleImportCollection}
        />
      )
    },
    {
      id: 'environments',
      label: 'Environments',
      component: <WorkspaceEnvironments workspace={activeWorkspace} />
    },
    {
      id: 'documentation',
      label: 'Documentation',
      component: <WorkspaceDocs workspace={activeWorkspace} />
    }
  ];

  return (
    <StyledWrapper className="h-full">
      <div className="h-full flex flex-col">
        {createCollectionModalOpen && (
          <CreateCollection
            onClose={() => setCreateCollectionModalOpen(false)}
          />
        )}

        {importCollectionModalOpen && (
          <ImportCollection
            onClose={() => setImportCollectionModalOpen(false)}
            handleSubmit={handleImportCollectionSubmit}
          />
        )}

        <div className="flex items-center gap-5 p-4 pb-2 workspace-header">
          <div className="text-xl font-semibold flex items-center gap-2">
            <IconCategory size={24} stroke={2} />
            {isRenamingWorkspace ? (
              <div className="workspace-rename-container" ref={workspaceRenameContainerRef}>
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
              </div>
            ) : (
              <span>{activeWorkspace.name}</span>
            )}
          </div>

          {!isRenamingWorkspace && activeWorkspace.type !== 'default' && (
            <Dropdown
              style="new"
              placement="bottom-end"
              onCreate={onDropdownCreate}
              icon={<IconDots size={20} strokeWidth={1.5} className="cursor-pointer" />}
            >
              <div className="workspace-menu-dropdown">
                <div className="dropdown-item" onClick={handleRenameWorkspaceClick}>
                  <IconEdit size={16} strokeWidth={1.5} />
                  <span>Rename</span>
                </div>
                <div className="dropdown-item" onClick={handleShowInFolder}>
                  <IconFolder size={16} strokeWidth={1.5} />
                  <span>Show in Folder</span>
                </div>
                <div className="dropdown-item" onClick={handleCloseWorkspaceClick}>
                  <IconX size={16} strokeWidth={1.5} />
                  <span>Close</span>
                </div>
              </div>
            </Dropdown>
          )}

          {workspaceNameError && isRenamingWorkspace && (
            <div className="workspace-error">{workspaceNameError}</div>
          )}
        </div>

        {closeWorkspaceModalOpen && (
          <CloseWorkspace
            workspaceUid={activeWorkspace.uid}
            onClose={() => setCloseWorkspaceModalOpen(false)}
          />
        )}

        <div className="flex items-center justify-between px-4 tabs-container">
          <div className="flex gap-5">
            {tabs.map((tab) => {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 text-sm border-b-2 transition-colors tab-item ${activeTab === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'collections' && (
            <div className="flex items-center gap-1 workspace-action-buttons">
              <button
                onClick={handleCreateCollection}
                className="workspace-button"
                title="Create Collection"
              >
                <IconPlus size={16} stroke={1.5} />
                Create
              </button>
              <button
                onClick={handleOpenCollection}
                className="workspace-button"
                title="Add Collection"
              >
                <IconFolders size={16} stroke={1.5} />
                Add
              </button>
              <button
                onClick={handleImportCollection}
                className="workspace-button"
                title="Import Collection"
              >
                <IconFileImport size={16} stroke={1.5} />
                Import
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          {tabs.find((tab) => tab.id === activeTab)?.component}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceHome;
