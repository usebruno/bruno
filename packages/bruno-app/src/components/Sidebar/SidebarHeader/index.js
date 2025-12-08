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
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import { importCollection, openCollection } from 'providers/ReduxStore/slices/collections/actions';
import { sortCollections } from 'providers/ReduxStore/slices/collections/index';
import { importCollectionInWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import { openApiSpec } from 'providers/ReduxStore/slices/apiSpec';

import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
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

  // Configuration for Add/Create dropdown items
  const addDropdownItems = [
    {
      id: 'create',
      leftSection: IconPlus,
      label: 'Create collection',
      onClick: () => {
        setCreateCollectionModalOpen(true);
      }
    },
    {
      id: 'import',
      leftSection: IconDownload,
      label: 'Import collection',
      onClick: () => {
        setImportCollectionModalOpen(true);
      }
    },
    {
      id: 'open',
      leftSection: IconFolder,
      label: 'Open collection',
      onClick: () => {
        handleOpenCollection();
      }
    },
    {
      type: 'label',
      label: 'API Specs'
    },
    {
      id: 'create-api-spec',
      leftSection: IconPlus,
      label: 'Create API Spec',
      onClick: () => {
        setCreateApiSpecModalOpen(true);
      }
    },
    {
      id: 'open-api-spec',
      leftSection: IconFileCode,
      label: 'Open API Spec',
      onClick: () => {
        handleOpenApiSpec();
      }
    }
  ];

  // Configuration for Actions dropdown items
  const actionsDropdownItems = [
    {
      id: 'sort',
      leftSection: getSortIcon(),
      label: getSortLabel(),
      onClick: () => {
        handleSortCollections();
      },
      testId: 'sort-collections-button'
    },
    {
      id: 'close-all',
      leftSection: IconSquareX,
      label: 'Close all',
      onClick: () => {
        selectAllCollectionsToClose();
      },
      testId: 'close-all-collections-button'
    }
  ];

  // Render Collections-specific actions
  const renderCollectionsActions = () => (
    <>
      <ActionIcon
        onClick={handleToggleSearch}
        label="Search requests"
      >
        <IconSearch size={14} stroke={1.5} aria-hidden="true" />
      </ActionIcon>

      {/* Add Collection dropdown */}
      <MenuDropdown
        data-testid="collections-header-add-menu"
        items={[
          { type: 'label', label: 'Collections' },
          ...addDropdownItems
        ]}
        placement="bottom-end"
      >
        <ActionIcon
          label="Add new collection"
        >
          <IconPlus size={14} stroke={1.5} aria-hidden="true" />
        </ActionIcon>
      </MenuDropdown>

      {/* More Actions dropdown (sort, close all, etc.) */}
      <MenuDropdown
        data-testid="collections-header-actions-menu"
        items={actionsDropdownItems}
        placement="bottom-end"
      >
        <ActionIcon
          label="More actions"
        >
          <IconDotsVertical size={14} stroke={1.5} aria-hidden="true" />
        </ActionIcon>
      </MenuDropdown>

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
