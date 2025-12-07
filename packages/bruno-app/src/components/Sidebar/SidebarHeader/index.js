import {
  IconArrowsSort,
  IconBox,
  IconDeviceDesktop,
  IconDotsVertical,
  IconDownload,
  IconFileCode,
  IconFolder,
  IconPlus,
  IconSearch,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
  IconSquareX,
  IconTrash
} from '@tabler/icons';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import { importCollection, openCollection } from 'providers/ReduxStore/slices/collections/actions';
import { sortCollections } from 'providers/ReduxStore/slices/collections/index';
import { importCollectionInWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import { openApiSpec } from 'providers/ReduxStore/slices/apiSpec';

import Dropdown from 'components/Dropdown';
import ImportCollection from 'components/Sidebar/ImportCollection';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';
import CreateApiSpec from 'components/Sidebar/ApiSpecs/CreateApiSpec';

import RemoveCollectionsModal from '../Collections/RemoveCollectionsModal/index';
import CreateCollection from '../CreateCollection';
import StyledWrapper from './StyledWrapper';

const SidebarHeader = ({ setShowSearch }) => {
  const dispatch = useDispatch();

  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

  // Get collection sort order
  const { collections } = useSelector((state) => state.collections);
  const { collectionSortOrder } = useSelector((state) => state.collections);
  const [collectionsToClose, setCollectionsToClose] = useState([]);

  const [importData, setImportData] = useState(null);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);
  const [createApiSpecModalOpen, setCreateApiSpecModalOpen] = useState(false);

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

  const addDropdownTippyRef = useRef();
  const onAddDropdownCreate = (ref) => (addDropdownTippyRef.current = ref);

  const actionsDropdownTippyRef = useRef();
  const onActionsDropdownCreate = (ref) => (actionsDropdownTippyRef.current = ref);

  const handleToggleSearch = () => {
    if (setShowSearch) {
      setShowSearch((prev) => !prev);
    }
  };

  const handleSortCollections = () => {
    let order;
    switch (collectionSortOrder) {
      case 'default':
        order = 'alphabetical';
        break;
      case 'alphabetical':
        order = 'reverseAlphabetical';
        break;
      case 'reverseAlphabetical':
        order = 'default';
        break;
      default:
        order = 'default';
        break;
    }
    dispatch(sortCollections({ order }));
  };

  const getSortIcon = () => {
    switch (collectionSortOrder) {
      case 'alphabetical':
        return IconSortDescendingLetters;
      case 'reverseAlphabetical':
        return IconArrowsSort;
      default:
        return IconSortAscendingLetters;
    }
  };

  const getSortLabel = () => {
    switch (collectionSortOrder) {
      case 'alphabetical':
        return 'Sort Z-A';
      case 'reverseAlphabetical':
        return 'Clear sort';
      default:
        return 'Sort A-Z';
    }
  };

  const selectAllCollectionsToClose = () => {
    setCollectionsToClose(collections.map((c) => c.uid));
  };

  const clearCollectionsToClose = () => {
    setCollectionsToClose([]);
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

  const handleOpenApiSpec = () => {
    dispatch(openApiSpec()).catch((err) => {
      console.error(err);
      toast.error('An error occurred while opening the API spec');
    });
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
      {createApiSpecModalOpen && (
        <CreateApiSpec
          onClose={() => setCreateApiSpecModalOpen(false)}
        />
      )}
    </>
  );

  // Render Collections-specific actions
  const renderCollectionsActions = () => (
    <>
      <button
        className="action-button"
        onClick={handleToggleSearch}
        title="Search requests"
      >
        <IconSearch size={14} stroke={1.5} />
      </button>
      {/* Add/Create dropdown */}
      <Dropdown
        onCreate={onAddDropdownCreate}
        icon={(
          <button className="action-button plus-icon-button" title="Add new">
            <IconPlus size={14} stroke={1.5} />
          </button>
        )}
        placement="bottom-end"
        style="new"
      >
        <div className="label-item">Collections</div>
        <div
          className="dropdown-item"
          onClick={() => {
            setCreateCollectionModalOpen(true);
            addDropdownTippyRef.current?.hide();
          }}
        >
          <IconPlus size={16} stroke={1.5} className="icon" />
          Create collection
        </div>
        <div
          className="dropdown-item"
          onClick={() => {
            addDropdownTippyRef.current?.hide();
            setImportCollectionModalOpen(true);
          }}
        >
          <IconDownload size={16} stroke={1.5} className="icon" />
          Import collection
        </div>
        <div
          className="dropdown-item"
          onClick={() => {
            handleOpenCollection();
            addDropdownTippyRef.current?.hide();
          }}
        >
          <IconFolder size={16} stroke={1.5} className="icon" />
          Open collection
        </div>

        <div className="label-item mt-2">API Specs</div>
        <div
          className="dropdown-item"
          onClick={() => {
            setCreateApiSpecModalOpen(true);
            addDropdownTippyRef.current?.hide();
          }}
        >
          <IconPlus size={16} stroke={1.5} className="icon" />
          Create API Spec
        </div>
        <div
          className="dropdown-item"
          onClick={() => {
            handleOpenApiSpec();
            addDropdownTippyRef.current?.hide();
          }}
        >
          <IconFileCode size={16} stroke={1.5} className="icon" />
          Open API Spec
        </div>
      </Dropdown>

      {/* Actions dropdown (sort, close all, etc.) */}
      <Dropdown
        onCreate={onActionsDropdownCreate}
        icon={(
          <button className="action-button" title="More actions">
            <IconDotsVertical size={14} stroke={1.5} />
          </button>
        )}
        placement="bottom-end"
        style="new"
      >
        <div
          className="dropdown-item"
          onClick={() => {
            handleSortCollections();
            actionsDropdownTippyRef.current?.hide();
          }}
          aria-label="Sort collections"
          title="Sort collections"
          data-testid="sort-collections-button"
        >
          {(() => {
            const SortIcon = getSortIcon();
            return <SortIcon size={16} stroke={1.5} className="icon" />;
          })()}
          {getSortLabel()}
        </div>
        <div
          className="dropdown-item"
          onClick={() => {
            selectAllCollectionsToClose();
            actionsDropdownTippyRef.current?.hide();
          }}
          aria-label="Close all collections"
          title="Close all collections"
          data-testid="close-all-collections-button"
        >
          <IconSquareX size={16} stroke={1.5} className="icon" />
          Close all
        </div>
      </Dropdown>

      {collectionsToClose.length > 0 && (
        <RemoveCollectionsModal collectionUids={collectionsToClose} onClose={clearCollectionsToClose} />
      )}
    </>
  );

  return (
    <StyledWrapper>
      {renderModals()}
      <div className="sidebar-header">
        <div className="section-title">
          <IconBox size={14} stroke={1.5} />
          <span>Collections</span>
        </div>

        {/* Action Buttons - Context Sensitive */}
        <div className="header-actions">
          {renderCollectionsActions()}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default SidebarHeader;
