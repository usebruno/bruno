import {
  IconArrowsSort,
  IconBox,
  IconDeviceDesktop,
  IconDotsVertical,
  IconDownload,
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

import Dropdown from 'components/Dropdown';
import ImportCollection from 'components/Sidebar/ImportCollection';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';

import RemoveCollectionsModal from '../Collections/RemoveCollectionsModal/index';
import CreateCollection from '../CreateCollection';
import StyledWrapper from './StyledWrapper';

const VIEW_TABS = [
  { id: 'collections', label: 'Collections', icon: IconBox }
];

const SidebarHeader = ({ setShowSearch, activeView = 'collections', onViewChange }) => {
  const dispatch = useDispatch();
  const { ipcRenderer } = window;

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

  const isSingleView = VIEW_TABS.length === 1;

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

  // Render Second Tab-specific actions
  const renderSecondTabActions = () => (
    <>
      {/* Add second tab actions here */}
    </>
  );

  // Render the view switcher - either tabs or single title
  const renderViewSwitcher = () => {
    if (isSingleView) {
      // Single view - just show the title
      const tab = VIEW_TABS[0];
      const TabIcon = tab.icon;
      return (
        <div className="section-title">
          <TabIcon size={14} stroke={1.5} />
          <span>{tab.label}</span>
        </div>
      );
    }

    // Multiple views - show segmented tabs
    return (
      <div className="view-tabs">
        {VIEW_TABS.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`view-tab ${activeView === tab.id ? 'active' : ''}`}
              onClick={() => onViewChange?.(tab.id)}
              title={tab.label}
            >
              <TabIcon size={14} stroke={1.5} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <StyledWrapper className={isSingleView ? 'single-view' : ''}>
      {renderModals()}
      <div className="sidebar-header">
        {renderViewSwitcher()}

        {/* Action Buttons - Context Sensitive */}
        <div className="header-actions">
          {activeView === 'collections' ? renderCollectionsActions() : renderSecondTabActions()}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default SidebarHeader;
