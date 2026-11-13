import { useMemo } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { IconAlertTriangle, IconClock } from '@tabler/icons';
import Button from 'ui/Button';
import {
  closeOpenCollectionModal,
  loadRecentCollections,
  openCollectionModal,
  openCollectionsFromModal,
  switchToCollection
} from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { selectOpenCollectionPathKeys } from 'providers/ReduxStore/slices/open-collection-modal/selectors';
import CollectionList from '../../components/CollectionList';
import EmptyState from '../../components/EmptyState';
import { formatRelativeTime } from '../../utils/relative-time';

const describeLastUse = ({ lastEvent, usedAt }) => `${lastEvent === 'closed' ? 'Closed' : 'Opened'} ${formatRelativeTime(usedAt)}`;

const RecentsPage = () => {
  const dispatch = useDispatch();
  const { status, items, error } = useSelector((state) => state.openCollectionModal.recents);
  const openPathKeyList = useSelector(selectOpenCollectionPathKeys, shallowEqual);
  const openPathKeys = useMemo(() => new Set(openPathKeyList), [openPathKeyList]);

  const showPage = (page) => dispatch(openCollectionModal(page));

  const openFolderButton = (
    <Button color="primary" fullWidth onClick={() => showPage('choose-folder')} data-testid="recents-open-folder">
      Open a collection folder…
    </Button>
  );

  if (status === 'error') {
    return (
      <EmptyState
        key="error"
        icon={IconAlertTriangle}
        title="Recents isn’t available"
        actions={(
          <>
            {openFolderButton}
            <Button variant="outline" color="secondary" fullWidth onClick={() => dispatch(loadRecentCollections())} data-testid="recents-retry">
              Try again
            </Button>
          </>
        )}
        data-testid="recents-error"
      >
        {error}
      </EmptyState>
    );
  }

  if (status !== 'ready') {
    return (
      <EmptyState key="loading" data-testid="recents-loading">
        Loading…
      </EmptyState>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        key="empty"
        icon={IconClock}
        title="No collections opened yet"
        actions={(
          <>
            {openFolderButton}
            <Button variant="outline" color="secondary" fullWidth onClick={() => showPage('my-computer')} data-testid="recents-show-my-computer">
              Show collections on this computer
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
              data-testid="recents-import"
            >
              Import it
            </button>
          </>
        )}
        data-testid="recents-empty"
      >
        Open a Bruno collection folder to work on it in place. Collections you open show up here next time.
      </EmptyState>
    );
  }

  return (
    <CollectionList
      collections={items}
      openPathKeys={openPathKeys}
      getMeta={describeLastUse}
      noMatchText="Recents only lists collections you have opened before. If it lives somewhere else, choose its folder."
      testIdPrefix="recents"
      onChooseFolder={() => showPage('choose-folder')}
      onOpen={(paths) => dispatch(openCollectionsFromModal(paths))}
      onSwitch={(collectionPath) => dispatch(switchToCollection(collectionPath))}
      onCancel={() => dispatch(closeOpenCollectionModal())}
    />
  );
};

export default RecentsPage;
