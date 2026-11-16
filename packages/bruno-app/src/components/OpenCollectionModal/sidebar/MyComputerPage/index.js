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
import CollectionList from '../../components/CollectionList';
import EmptyState from '../../components/EmptyState';
import { describeLastUse, formatRelativeTime } from '../../utils/relative-time';
import { countSearchLocations } from '../../utils/search-locations';
import SearchLocationsBanner from './SearchLocationsBanner';

const MyComputerPage = () => {
  const dispatch = useDispatch();
  const { status, locations, error } = useSelector((state) => state.openCollectionModal.myComputer);
  const collections = useSelector(selectMyComputerCollections);
  const recentItems = useSelector((state) => state.openCollectionModal.recents.items);
  const searchWholeComputer = useSelector(selectSearchWholeComputer);
  const openPathKeyList = useSelector(selectOpenCollectionPathKeys, shallowEqual);
  const openPathKeys = useMemo(() => new Set(openPathKeyList), [openPathKeyList]);
  const recentsByKey = useMemo(() => new Map(recentItems.map((item) => [toPathKey(item.path), item])), [recentItems]);

  const showPage = (page) => dispatch(openCollectionModal(page));

  const getMeta = (collection) => {
    const recent = recentsByKey.get(toPathKey(collection.path));
    if (recent) {
      return describeLastUse(recent);
    }
    return collection.mtime > 0 ? `Modified ${formatRelativeTime(collection.mtime)}` : null;
  };

  const openFolderButton = (
    <Button color="primary" fullWidth onClick={() => showPage('choose-folder')} data-testid="my-computer-open-folder">
      Open a collection folder…
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
    const locationCount = countSearchLocations(locations);
    return (
      <EmptyState
        key="empty"
        icon={IconDeviceLaptop}
        title="No collections found on this computer"
        actions={(
          <>
            {openFolderButton}
            <Button variant="outline" color="secondary" fullWidth onClick={() => showPage('locations')} data-testid="my-computer-manage-locations">
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
              onClick={() => showPage('import')}
              data-testid="my-computer-import"
            >
              Import it
            </button>
          </>
        )}
        data-testid="my-computer-empty"
      >
        Bruno searched {locationCount > 0 ? countOf(locationCount, 'location') : 'its default locations'}. Open a collection folder from anywhere, or add more places to search.
      </EmptyState>
    );
  }

  return (
    <CollectionList
      collections={collections}
      openPathKeys={openPathKeys}
      getMeta={getMeta}
      searchPlaceholder={`Search ${countOf(collections.length, 'collection')}`}
      banner={searchWholeComputer ? null : <SearchLocationsBanner onManage={() => showPage('locations')} />}
      emptyText="Looking for collections…"
      noMatchText="Bruno may not search the folder it lives in. Choose its folder to open it, or add the folder to your search locations."
      testIdPrefix="my-computer"
      onChooseFolder={() => showPage('choose-folder')}
      onOpen={(paths) => dispatch(openCollectionsFromModal(paths))}
      onSwitch={(collectionPath) => dispatch(switchToCollection(collectionPath))}
      onCancel={() => dispatch(closeOpenCollectionModal())}
    />
  );
};

export default MyComputerPage;
