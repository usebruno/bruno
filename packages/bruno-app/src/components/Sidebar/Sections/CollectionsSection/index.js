import { useState, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconArrowsSort,
  IconDotsVertical,
  IconDownload,
  IconFolder,
  IconPlus,
  IconSearch,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
  IconSquareX,
  IconBox,
  IconTerminal2
} from '@tabler/icons';

import { importCollection, openCollection, importCollectionFromZip, createCollection, newHttpRequest } from 'providers/ReduxStore/slices/collections/actions';
import { mountScratchCollection } from 'providers/ReduxStore/slices/workspaces/actions';
import { sortCollections } from 'providers/ReduxStore/slices/collections/index';
import { normalizePath } from 'utils/common/path';
import { isScratchCollection, flattenItems, isItemTransientRequest } from 'utils/collections';
import { sanitizeName } from 'utils/common/regex';
import { getDefaultCollectionLocation } from 'utils/common/platform';
import { DEFAULT_COLLECTION_FORMAT } from 'utils/common/constants';
import { multiLineMsg } from 'utils/common';
import { formatIpcError } from 'utils/common/error';
import useLocalStorage from 'hooks/useLocalStorage';
import useOnClickOutside from 'hooks/useOnClickOutside';

import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import ImportCollection from 'components/Sidebar/ImportCollection';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';
import BulkImportCollectionLocation from 'components/Sidebar/BulkImportCollectionLocation';
import CloneGitRepository from 'components/Sidebar/CloneGitRespository';
import RemoveCollectionsModal from 'components/Sidebar/Collections/RemoveCollectionsModal/index';
import WelcomeModal from 'components/WelcomeModal';
import Collections from 'components/Sidebar/Collections';
import SidebarSection from 'components/Sidebar/SidebarSection';
import { openDevtoolsAndSwitchToTerminal } from 'utils/terminal';

const CollectionsSection = () => {
  const [showSearch, setShowSearch] = useState(false);
  const dispatch = useDispatch();

  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);
  const preferences = useSelector((state) => state.app.preferences);

  const { collections } = useSelector((state) => state.collections);
  const { collectionSortOrder } = useSelector((state) => state.collections);
  const [collectionsToClose, setCollectionsToClose] = useState([]);

  const [importData, setImportData] = useState(null);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);
  const [showCloneGitModal, setShowCloneGitModal] = useState(false);
  const [gitRepositoryUrl, setGitRepositoryUrl] = useState(null);

  // Welcome modal state
  const [welcomeDismissed, setWelcomeDismissed] = useLocalStorage('bruno.welcomeModalDismissed', false);

  // Inline collection creation state
  const [isCreatingCollectionInline, setIsCreatingCollectionInline] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [collectionNameError, setCollectionNameError] = useState('');
  const newCollectionInputRef = useRef(null);
  const newCollectionContainerRef = useRef(null);

  const handleCreateCollectionClick = () => {
    setIsCreatingCollectionInline(true);
    setNewCollectionName('Untitled Collection');
    setCollectionNameError('');
    setTimeout(() => {
      if (newCollectionInputRef.current) {
        newCollectionInputRef.current.focus();
        newCollectionInputRef.current.select();
      }
    }, 0);
  };

  const handleCancelInlineCreate = () => {
    setIsCreatingCollectionInline(false);
    setNewCollectionName('');
    setCollectionNameError('');
  };

  const handleSaveNewCollection = () => {
    const name = newCollectionName.trim();
    if (!name) {
      setCollectionNameError('Name cannot be empty.');
      return;
    }

    const isDefaultWorkspace = activeWorkspace?.type === 'default';
    const location = isDefaultWorkspace
      ? (get(preferences, 'general.defaultCollectionLocation', '') || getDefaultCollectionLocation())
      : (activeWorkspace?.pathname ? `${activeWorkspace.pathname}/collections` : getDefaultCollectionLocation());

    if (!location) {
      toast.error('No default collection location set. Please set one in Preferences.');
      return;
    }

    const folderName = sanitizeName(name);
    dispatch(createCollection(name, folderName, location, { format: DEFAULT_COLLECTION_FORMAT }))
      .then(() => {
        toast.success('Collection created!');
        handleCancelInlineCreate();
      })
      .catch((e) => {
        toast.error(multiLineMsg('An error occurred while creating the collection', formatIpcError(e)));
      });
  };

  const handleCollectionNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveNewCollection();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelInlineCreate();
    }
  };

  useOnClickOutside(newCollectionContainerRef, handleCancelInlineCreate, isCreatingCollectionInline);

  const workspaceCollections = useMemo(() => {
    if (!activeWorkspace) return [];

    return collections.filter((c) => {
      if (isScratchCollection(c, workspaces)) {
        return false;
      }
      return activeWorkspace.collections?.some((wc) => normalizePath(wc.path) === normalizePath(c.pathname));
    });
  }, [activeWorkspace, collections, workspaces]);

  const handleImportCollection = ({ rawData, type, repositoryUrl, ...rest }) => {
    setImportCollectionModalOpen(false);

    if (type === 'git-repository') {
      setGitRepositoryUrl(repositoryUrl);
      setShowCloneGitModal(true);
      return;
    }

    setImportData({ rawData, type, ...rest });
    setImportCollectionLocationModalOpen(true);
  };

  const handleImportCollectionLocation = (convertedCollection, collectionLocation, options = {}) => {
    const importAction = options.isZipImport
      ? importCollectionFromZip(convertedCollection.zipFilePath, collectionLocation)
      : importCollection(convertedCollection, collectionLocation, options);

    dispatch(importAction)
      .then(() => {
        setImportCollectionLocationModalOpen(false);
        setImportData(null);
      });
  };

  const handleCloseGitModal = () => {
    setShowCloneGitModal(false);
    setGitRepositoryUrl(null);
  };

  const handleToggleSearch = () => {
    setShowSearch((prev) => !prev);
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
    setCollectionsToClose(workspaceCollections.map((c) => c.uid));
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

  const handleCreateRequest = async () => {
    try {
      const scratch = await dispatch(mountScratchCollection(activeWorkspaceUid));
      if (!scratch) {
        toast.error('Could not initialize scratch collection');
        return;
      }

      const scratchUid = scratch.uid || scratch;
      const state = collections;
      const scratchCollection = state.find((c) => c.uid === scratchUid);

      const generateName = (collection) => {
        if (!collection || !collection.items) return 'Untitled 1';
        const allItems = flattenItems(collection.items);
        const transientRequests = allItems.filter((item) => isItemTransientRequest(item));
        let maxNumber = 0;
        transientRequests.forEach((item) => {
          const match = item.name?.match(/^Untitled (\d+)$/);
          if (match) {
            const number = parseInt(match[1], 10);
            if (number > maxNumber) maxNumber = number;
          }
        });
        return `Untitled ${maxNumber + 1}`;
      };

      const uniqueName = generateName(scratchCollection);
      const filename = sanitizeName(uniqueName);

      dispatch(
        newHttpRequest({
          requestName: uniqueName,
          filename: filename,
          requestType: 'http-request',
          requestUrl: '',
          requestMethod: 'GET',
          collectionUid: scratchUid,
          itemUid: null,
          isTransient: true
        })
      ).catch((err) => toast.error(formatIpcError(err) || 'An error occurred while creating the request'));
    } catch (err) {
      toast.error('An error occurred while creating the request');
    }
  };

  const addDropdownItems = [
    {
      id: 'create',
      leftSection: IconPlus,
      label: 'Create collection',
      onClick: () => {
        handleCreateCollectionClick();
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
      id: 'import',
      leftSection: IconDownload,
      label: 'Import collection',
      onClick: () => {
        setImportCollectionModalOpen(true);
      }
    }
  ];

  const actionsDropdownItems = [
    {
      id: 'sort',
      leftSection: getSortIcon(),
      label: getSortLabel(),
      onClick: () => {
        handleSortCollections();
      }
    },
    {
      id: 'close-all',
      leftSection: IconSquareX,
      label: 'Close all',
      onClick: () => {
        selectAllCollectionsToClose();
      }
    },
    {
      id: 'open-in-terminal',
      leftSection: IconTerminal2,
      label: 'Open in Terminal',
      onClick: () => {
        openDevtoolsAndSwitchToTerminal(dispatch, activeWorkspace?.pathname);
      }
    }
  ];

  const sectionActions = (
    <>
      <ActionIcon
        onClick={handleToggleSearch}
        label="Search requests"
      >
        <IconSearch size={14} stroke={1.5} aria-hidden="true" />
      </ActionIcon>

      <MenuDropdown
        data-testid="collections-header-add-menu"
        items={addDropdownItems}
        placement="bottom-end"
      >
        <ActionIcon
          label="Add new collection"
        >
          <IconPlus size={14} stroke={1.5} aria-hidden="true" />
        </ActionIcon>
      </MenuDropdown>

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
    <>
      {!welcomeDismissed && (
        <WelcomeModal
          onDismiss={() => setWelcomeDismissed(true)}
          onImportCollection={() => {
            setWelcomeDismissed(true);
            setImportCollectionModalOpen(true);
          }}
          onCreateCollection={() => {
            setWelcomeDismissed(true);
            handleCreateCollectionClick();
          }}
          onOpenCollection={() => {
            setWelcomeDismissed(true);
            handleOpenCollection();
          }}
          onCreateRequest={() => {
            setWelcomeDismissed(true);
            handleCreateRequest();
          }}
        />
      )}
      {importCollectionModalOpen && (
        <ImportCollection
          onClose={() => setImportCollectionModalOpen(false)}
          handleSubmit={handleImportCollection}
        />
      )}
      {importCollectionLocationModalOpen && importData && (importData.type !== 'multiple' && importData.type !== 'bulk') && (
        <ImportCollectionLocation
          rawData={importData.rawData}
          format={importData.type}
          onClose={() => setImportCollectionLocationModalOpen(false)}
          handleSubmit={handleImportCollectionLocation}
        />
      )}
      {importCollectionLocationModalOpen && importData && (importData.type === 'multiple' || importData.type === 'bulk') && (
        <BulkImportCollectionLocation
          importData={importData}
          onClose={() => setImportCollectionLocationModalOpen(false)}
          handleSubmit={handleImportCollectionLocation}
        />
      )}
      {showCloneGitModal && (
        <CloneGitRepository
          onClose={handleCloseGitModal}
          onFinish={handleCloseGitModal}
          collectionRepositoryUrl={gitRepositoryUrl}
        />
      )}
      <SidebarSection
        id="collections"
        title="Collections"
        icon={IconBox}
        actions={sectionActions}
      >
        <Collections
          showSearch={showSearch}
          isCreatingInline={isCreatingCollectionInline}
          inlineCreationProps={{
            containerRef: newCollectionContainerRef,
            inputRef: newCollectionInputRef,
            name: newCollectionName,
            error: collectionNameError,
            onNameChange: (e) => {
              setNewCollectionName(e.target.value);
              setCollectionNameError('');
            },
            onKeyDown: handleCollectionNameKeyDown,
            onSave: handleSaveNewCollection,
            onCancel: handleCancelInlineCreate
          }}
          onCreateClick={handleCreateCollectionClick}
        />
      </SidebarSection>
    </>
  );
};

export default CollectionsSection;
