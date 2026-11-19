import { useState } from 'react';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { useDispatch, useSelector, useStore } from 'react-redux';
import {
  IconArrowsSort,
  IconDotsVertical,
  IconPlus,
  IconSearch,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
  IconSquareX,
  IconBox,
  IconTerminal2
} from '@tabler/icons';

import { newHttpRequest } from 'providers/ReduxStore/slices/collections/actions';
import { sortCollections } from 'providers/ReduxStore/slices/collections/index';
import { savePreferences, setIsCreatingCollection, toggleSidebarSearch } from 'providers/ReduxStore/slices/app';
import { openCollectionModal, openCollectionModalOnLastPage } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { flattenItems, isItemTransientRequest, getWorkspaceCollections } from 'utils/collections';
import { selectCollections, selectCollectionSortOrder, selectActiveWorkspace } from 'src/selectors/collections';
import { sanitizeName } from 'utils/common/regex';
import { OPEN_COLLECTION_PAGE } from 'utils/common/constants';
import filter from 'lodash/filter';

import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import IconFolderDown from 'components/Icons/IconFolderDown';
import ToolHint from 'components/ToolHint';
import RemoveCollections from 'components/Sidebar/Collections/Collection/RemoveCollections/index';
import CreateCollection from 'components/Sidebar/CreateCollection';
import WelcomeModal from 'components/WelcomeModal';
import Collections from 'components/Sidebar/Collections';
import SidebarSection from 'components/Sidebar/SidebarSection';
import { openDevtoolsAndSwitchToTerminal } from 'utils/terminal';
import useKeybinding from 'hooks/useKeybinding';
import useKeybindingDisplayText from 'hooks/useKeybindingDisplayText';

const CollectionsSection = () => {
  const dispatch = useDispatch();
  const showSearch = useSelector((state) => state.app.showSidebarSearch);

  const activeWorkspace = useSelector(selectActiveWorkspace);

  const store = useStore();
  const collectionSortOrder = useSelector(selectCollectionSortOrder);
  const isCreatingCollection = useSelector((state) => state.app.isCreatingCollection);
  const preferences = useSelector((state) => state.app.preferences);
  const [collectionsToClose, setCollectionsToClose] = useState([]);

  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [advancedCreateName, setAdvancedCreateName] = useState('');

  // Import collection shortcut
  useKeybinding('importCollection', () => {
    dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.IMPORT));
    return false;
  });
  useKeybinding('openCollection', () => {
    dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER));
    return false;
  });
  const getKeybindingDisplayText = useKeybindingDisplayText();
  const importShortcut = getKeybindingDisplayText('importCollection');

  // Default to true (don't show modal) so that:
  // 1. Existing users who upgrade (no hasSeenWelcomeModal in their prefs) don't see it
  // 2. The modal doesn't flash before preferences are loaded from the electron process
  // Only genuinely new users will have hasSeenWelcomeModal explicitly set to false by onboarding
  const hasSeenWelcomeModal = get(preferences, 'onboarding.hasSeenWelcomeModal', true);
  const showWelcomeModal = !hasSeenWelcomeModal;

  const handleDismissWelcomeModal = () => {
    const updatedPreferences = {
      ...preferences,
      onboarding: {
        ...preferences.onboarding,
        hasSeenWelcomeModal: true
      }
    };
    dispatch(savePreferences(updatedPreferences)).catch(() => {
      toast.error('Failed to save preferences');
    });
  };

  const getActiveWorkspaceCollections = () => {
    const state = store.getState();
    return getWorkspaceCollections({
      collections: selectCollections(state),
      workspaces: state.workspaces.workspaces,
      activeWorkspace
    });
  };

  const handleToggleSearch = () => {
    dispatch(toggleSidebarSearch());
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
    setCollectionsToClose(getActiveWorkspaceCollections().map((c) => c.uid));
  };

  const clearCollectionsToClose = () => {
    setCollectionsToClose([]);
  };

  const handleStartRequest = () => {
    const scratchCollectionUid = activeWorkspace?.scratchCollectionUid;
    if (!scratchCollectionUid) {
      toast.error('Unable to create request');
      return;
    }

    const scratchCollection = selectCollections(store.getState()).find((c) => c.uid === scratchCollectionUid);
    if (!scratchCollection) {
      toast.error('Unable to create request');
      return;
    }

    const allItems = flattenItems(scratchCollection.items || []);
    const transientRequests = filter(allItems, (item) => isItemTransientRequest(item));
    let maxNumber = 0;
    transientRequests.forEach((item) => {
      const match = item.name?.match(/^Untitled (\d+)$/);
      if (match) {
        const number = parseInt(match[1], 10);
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    });
    const requestName = `Untitled ${maxNumber + 1}`;
    const filename = sanitizeName(requestName);

    dispatch(
      newHttpRequest({
        requestName,
        filename,
        requestType: 'http-request',
        requestUrl: '',
        requestMethod: 'GET',
        collectionUid: scratchCollectionUid,
        itemUid: null,
        isTransient: true
      })
    ).catch((err) => {
      toast.error('An error occurred while creating the request');
    });
  };

  const handleOpenAdvancedCreate = (name) => {
    dispatch(setIsCreatingCollection(false));
    setAdvancedCreateName(name || '');
    setCreateCollectionModalOpen(true);
  };

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
        data-testid="sidebar-search-toggle"
      >
        <IconSearch size={14} stroke={1.5} aria-hidden="true" />
      </ActionIcon>

      <ToolHint text="New collection" toolhintId="CollectionsHeaderNewToolhintId" place="bottom" positionStrategy="fixed" className="flex">
        <ActionIcon
          onClick={() => dispatch(setIsCreatingCollection(true))}
          aria-label="New collection"
          data-testid="collections-header-new"
        >
          <IconPlus size={14} stroke={1.5} aria-hidden="true" />
        </ActionIcon>
      </ToolHint>

      <ToolHint
        text={importShortcut ? `Open or import collection (${importShortcut})` : 'Open or import collection'}
        toolhintId="CollectionsHeaderOpenToolhintId"
        place="bottom"
        positionStrategy="fixed"
        className="flex"
      >
        <ActionIcon
          onClick={() => dispatch(openCollectionModalOnLastPage())}
          aria-label="Open or import collection"
          data-testid="collections-header-open"
        >
          <IconFolderDown size={14} strokeWidth={1.5} aria-hidden="true" />
        </ActionIcon>
      </ToolHint>

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
        <RemoveCollections collectionUids={collectionsToClose} onClose={clearCollectionsToClose} />
      )}
    </>
  );

  return (
    <>
      {showWelcomeModal && (
        <WelcomeModal
          onDismiss={handleDismissWelcomeModal}
          onImportCollection={() => {
            handleDismissWelcomeModal();
            dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.IMPORT));
          }}
          onCreateCollection={() => {
            handleDismissWelcomeModal();
            setCreateCollectionModalOpen(true);
          }}
          onOpenCollection={() => {
            handleDismissWelcomeModal();
            dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.MY_COMPUTER));
          }}
          onStartRequest={() => {
            handleDismissWelcomeModal();
            handleStartRequest();
          }}
        />
      )}
      {createCollectionModalOpen && (
        <CreateCollection
          onClose={() => {
            setCreateCollectionModalOpen(false);
            setAdvancedCreateName('');
          }}
          initialCollectionName={advancedCreateName}
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
          isCreatingCollection={isCreatingCollection}
          onCreateClick={() => dispatch(setIsCreatingCollection(true))}
          onDismissCreate={() => dispatch(setIsCreatingCollection(false))}
          onOpenAdvancedCreate={handleOpenAdvancedCreate}
        />
      </SidebarSection>
    </>
  );
};

export default CollectionsSection;
