import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconAlertTriangle, IconHistory } from '@tabler/icons';
import Button from 'ui/Button';
import {
  closeOpenCollectionModal,
  loadRecentCollections,
  openCollectionModal,
  openCollectionsFromModal,
  switchToCollection
} from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { selectOpenCollections } from 'providers/ReduxStore/slices/open-collection-modal/selectors';
import { OPEN_COLLECTION_PAGE } from 'utils/common/constants';
import ChooseFolderHint from '../../components/ChooseFolderHint';
import CollectionList from '../../components/CollectionList';
import EmptyState from '../../components/EmptyState';
import { describeLastUse } from '../../utils/relative-time';
import { isSameOpenCollections, mergeOpenCollections } from './utils';

const RecentsPage = () => {
  const dispatch = useDispatch();
  const { status, items, error } = useSelector((state) => state.openCollectionModal.recents);
  const openCollections = useSelector(selectOpenCollections, isSameOpenCollections);
  const { collections, openPathKeys, unrecordedPathKeys } = useMemo(
    () => mergeOpenCollections(items, openCollections),
    [items, openCollections]
  );

  const chooseFolders = () => dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, { pickFolders: true }));

  const openFolderButton = (
    <Button color="primary" onClick={chooseFolders} data-testid="recents-open-folder">
      Open a collection folder…
      <ChooseFolderHint id="recents-open-folder-hint" />
    </Button>
  );

  if (status === 'error' && items.length === 0) {
    return (
      <EmptyState
        key="error"
        icon={IconAlertTriangle}
        title="Recents isn’t available"
        actions={(
          <>
            {openFolderButton}
            <Button variant="outline" color="secondary" onClick={() => dispatch(loadRecentCollections())} data-testid="recents-retry">
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

  if (status === 'idle' || status === 'loading') {
    return (
      <EmptyState key="loading" isLoading data-testid="recents-loading">
        Loading…
      </EmptyState>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        key="empty"
        icon={IconHistory}
        title="No Recent collections here.."
        actions={(
          <Button size="sm" variant="outline" color="secondary" onClick={chooseFolders} data-testid="recents-open-folder">
            Choose folder
          </Button>
        )}
        data-testid="recents-empty"
      >
        Start with a sample collection
      </EmptyState>
    );
  }

  return (
    <CollectionList
      collections={collections}
      openPathKeys={openPathKeys}
      hiddenPathKeys={unrecordedPathKeys}
      getMeta={describeLastUse}
      noMatchText="Recents only lists collections you have opened before. If it lives somewhere else, choose its folder."
      testIdPrefix="recents"
      showChooseFolderNextToSearch={false}
      onChooseFolder={chooseFolders}
      onOpen={(paths) => dispatch(openCollectionsFromModal(paths))}
      onSwitch={(collectionPath) => dispatch(switchToCollection(collectionPath))}
      onCancel={() => dispatch(closeOpenCollectionModal())}
    />
  );
};

export default RecentsPage;
