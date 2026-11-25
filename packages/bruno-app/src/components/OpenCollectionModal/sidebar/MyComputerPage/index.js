import { useMemo } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { IconAlertTriangle, IconDeviceLaptop } from '@tabler/icons';
import Button from 'ui/Button';
import {
  closeOpenCollectionModal,
  openCollectionModal,
  openCollectionsFromModal,
  scanMyComputer,
  switchToCollection
} from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { toPathKey } from 'providers/ReduxStore/slices/open-collection-modal/collection-paths';
import { countOf } from 'providers/ReduxStore/slices/open-collection-modal/folder-results';
import {
  selectMyComputerCollections,
  selectOpenCollectionPathKeys,
  selectSearchWholeComputer
} from 'providers/ReduxStore/slices/open-collection-modal/selectors';
import { OPEN_COLLECTION_PAGE, OPEN_COLLECTION_SUB_PAGE } from 'utils/common/constants';
import ChooseFolderHint from '../../components/ChooseFolderHint';
import CollectionList from '../../components/CollectionList';
import EmptyState from '../../components/EmptyState';
import { describeLastUse, formatRelativeTime } from '../../utils/relative-time';
import { countSearchLocations, searchesWholeComputer } from '../../utils/search-locations';
import SearchLocationsBanner from './SearchLocationsBanner';

const describeSearchedPlaces = (locations) => {
  if (searchesWholeComputer(locations)) {
    return 'this computer';
  }
  const locationCount = countSearchLocations(locations);
  return locationCount > 0 ? countOf(locationCount, 'location') : 'its default locations';
};

const MyComputerPage = () => {
  const dispatch = useDispatch();
  const { status, locations, error } = useSelector((state) => state.openCollectionModal.myComputer);
  const collections = useSelector(selectMyComputerCollections);
  const recentItems = useSelector((state) => state.openCollectionModal.recents.items);
  const searchWholeComputer = useSelector(selectSearchWholeComputer);
  const openPathKeyList = useSelector(selectOpenCollectionPathKeys, shallowEqual);
  const openPathKeys = useMemo(() => new Set(openPathKeyList), [openPathKeyList]);
  const recentsByKey = useMemo(() => new Map(recentItems.map((item) => [toPathKey(item.path), item])), [recentItems]);
  const openLastCollections = useMemo(() => {
    const isOpen = (collection) => openPathKeys.has(toPathKey(collection.path));
    return [...collections.filter((collection) => !isOpen(collection)), ...collections.filter(isOpen)];
  }, [collections, openPathKeys]);

  const showPage = (page) => dispatch(openCollectionModal(page));
  const chooseFolders = () => dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, { pickFolders: true }));

  const getMeta = (collection) => {
    const recent = recentsByKey.get(toPathKey(collection.path));
    if (recent) {
      return describeLastUse(recent);
    }
    return collection.mtime > 0 ? `Modified ${formatRelativeTime(collection.mtime)}` : null;
  };

  const openFolderButton = (
    <Button color="primary" fullWidth onClick={chooseFolders} data-testid="my-computer-open-folder">
      Open a collection folder…
      <ChooseFolderHint id="my-computer-open-folder-hint" />
    </Button>
  );

  if (status === 'error' && collections.length === 0) {
    return (
      <EmptyState
        key="error"
        icon={IconAlertTriangle}
        title="Collection discovery isn’t available"
        actions={(
          <>
            {openFolderButton}
            <Button variant="outline" color="secondary" fullWidth onClick={() => dispatch(scanMyComputer())} data-testid="my-computer-retry">
              Try again
            </Button>
          </>
        )}
        data-testid="my-computer-error"
      >
        {error}
      </EmptyState>
    );
  }

  if (locations === null) {
    return (
      <EmptyState key="loading" data-testid="my-computer-loading">
        Loading…
      </EmptyState>
    );
  }

  if (status === 'done' && collections.length === 0) {
    return (
      <EmptyState
        key="empty"
        icon={IconDeviceLaptop}
        title="No collections found on this computer"
        actions={(
          <>
            {openFolderButton}
            <Button variant="outline" color="secondary" fullWidth onClick={() => showPage(OPEN_COLLECTION_SUB_PAGE.LOCATIONS)} data-testid="my-computer-manage-locations">
              Manage search locations
            </Button>
          </>
        )}
        foot={(
          <>
            Have a .yml, .zip or a Postman export?{' '}
            <button
              type="button"
              className="text-link hover:underline whitespace-nowrap"
              onClick={() => showPage(OPEN_COLLECTION_PAGE.IMPORT)}
              data-testid="my-computer-import"
            >
              Import it
            </button>
          </>
        )}
        data-testid="my-computer-empty"
      >
        Bruno searched {describeSearchedPlaces(locations)}. Open a collection folder from anywhere, or add more places to search.
      </EmptyState>
    );
  }

  return (
    <CollectionList
      collections={openLastCollections}
      openPathKeys={openPathKeys}
      getMeta={getMeta}
      searchPlaceholder={`Search ${countOf(collections.length, 'collection')}`}
      banner={searchWholeComputer ? null : <SearchLocationsBanner onManage={() => showPage(OPEN_COLLECTION_SUB_PAGE.LOCATIONS)} />}
      emptyText="Looking for collections…"
      noMatchText="Bruno may not search the folder it lives in. Choose its folder to open it, or add the folder to your search locations."
      testIdPrefix="my-computer"
      onChooseFolder={chooseFolders}
      onOpen={(paths) => dispatch(openCollectionsFromModal(paths))}
      onSwitch={(collectionPath) => dispatch(switchToCollection(collectionPath))}
      onCancel={() => dispatch(closeOpenCollectionModal())}
    />
  );
};

export default MyComputerPage;
