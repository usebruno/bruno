import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { IconPlus, IconFolder, IconDownload, IconHome, IconSearch, IconDeviceDesktop } from '@tabler/icons';

import { showHomePage } from 'providers/ReduxStore/slices/app';
import { openCollection, importCollection } from 'providers/ReduxStore/slices/collections/actions';
import { importCollectionInWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';

import Dropdown from 'components/Dropdown';
import ImportCollection from 'components/Sidebar/ImportCollection';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';

import CreateCollection from '../CreateCollection';
import WorkspaceSelector from './WorkspaceSelector';
import StyledWrapper from './StyledWrapper';

const TitleBar = ({ showSearch, setShowSearch }) => {
  const dispatch = useDispatch();
  const { ipcRenderer } = window;

  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

  const [importData, setImportData] = useState(null);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);

  const actionsDropdownTippyRef = useRef();
  const onActionsDropdownCreate = (ref) => (actionsDropdownTippyRef.current = ref);

  const handleImportCollection = ({ rawData, type }) => {
    setImportCollectionModalOpen(false);

    if (activeWorkspace && activeWorkspace.type !== 'default') {
      dispatch(importCollectionInWorkspace(rawData, activeWorkspace.uid, undefined, type))
        .catch((err) => {
          toast.error('An error occurred while importing the collection');
        });
    } else {
      setImportData({ rawData, type });
      setImportCollectionLocationModalOpen(true);
    }
  };

  const handleImportCollectionLocation = (convertedCollection, collectionLocation) => {
    dispatch(importCollection(convertedCollection, collectionLocation))
      .then(() => {
        setImportCollectionLocationModalOpen(false);
        setImportData(null);
        toast.success('Collection imported successfully');
      })
      .catch((err) => {
        console.error(err);
        toast.error('An error occurred while importing the collection');
      });
  };

  const handleToggleSearch = () => {
    if (setShowSearch) {
      setShowSearch((prev) => !prev);
    }
  };

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
        />
      )}
      {importCollectionModalOpen && (
        <ImportCollection
          onClose={() => setImportCollectionModalOpen(false)}
          handleSubmit={handleImportCollection}
        />
      )}
      {importCollectionLocationModalOpen && importData && (
        <ImportCollectionLocation
          rawData={importData.rawData}
          format={importData.type}
          onClose={() => setImportCollectionLocationModalOpen(false)}
          handleSubmit={handleImportCollectionLocation}
        />
      )}
    </>
  );

  return (
    <StyledWrapper className="px-2 py-2">
      {renderModals()}
      <div className="titlebar-container">
        <WorkspaceSelector />

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
