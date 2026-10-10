import React, { useMemo, useState } from 'react';
import get from 'lodash/get';
import { uuid } from 'utils/common';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import useClearStoredRunnerExchanges from 'hooks/useClearStoredRunnerExchanges';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { runCollectionFolder } from 'providers/ReduxStore/slices/collections/actions';
import { areItemsLoading, getEffectiveTagsForItem, getRequestItemsForCollectionRun } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import RunnerTags from 'components/RunnerResults/RunnerTags/index';
import RunConfigurationPanel from 'components/RunnerResults/RunConfigurationPanel';
import Button from 'ui/Button';

const buildRunConfigurationCollection = (collection, runTargetFolder) => {
  if (!collection) {
    return null;
  }

  if (!runTargetFolder) {
    return collection;
  }

  return {
    ...collection,
    items: runTargetFolder.items || [],
    pathname: runTargetFolder.pathname
  };
};

const NO_RUNNER_TAGS = { include: [], exclude: [] };

const RunCollectionItem = ({ collectionUid, item, onClose }) => {
  const dispatch = useDispatch();
  const [delay, setDelay] = useState('');
  const [selectedRequestItems, setSelectedRequestItems] = useState([]);

  const collection = useSelector((state) => state.collections.collections?.find((c) => c.uid === collectionUid));
  const isCollectionRunInProgress = collection?.runnerResult?.info?.status && (collection?.runnerResult?.info?.status !== 'ended');

  // tags for the collection run
  const tags = get(collection, 'runnerTags', NO_RUNNER_TAGS);

  const clearStoredRunnerExchanges = useClearStoredRunnerExchanges(collection.uid);

  const onSubmit = async ({ recursive, selectedRequestUids }) => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-runner'
      })
    );
    if (!isCollectionRunInProgress) {
      await clearStoredRunnerExchanges();
      dispatch(runCollectionFolder(
        collection.uid,
        item ? item.uid : null,
        recursive,
        delay ? Number(delay) : null,
        tags,
        selectedRequestUids
      ));
    }
    onClose();
  };

  const handleViewRunner = (e) => {
    e.preventDefault();
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-runner'
      })
    );
    onClose();
  };

  const isFolderLoading = areItemsLoading(item);
  const items = item ? item.items : collection.items;

  const requestCounts = useMemo(() => {
    const inheritedTags = item ? getEffectiveTagsForItem(collection, item) : [];

    return {
      recursiveRun: getRequestItemsForCollectionRun({ recursive: true, tags, items, inheritedTags }).length,
      folderRun: getRequestItemsForCollectionRun({ recursive: false, tags, items, inheritedTags }).length
    };
  }, [collection, item, items, tags]);

  const shouldDisableRecursiveFolderRun = requestCounts.recursiveRun <= 0;
  const shouldDisableFolderRun = requestCounts.folderRun <= 0;

  const selectedCount = selectedRequestItems.length;

  // Using memoization to avoid unwanted resets of users' request de-/selection and/or rearrangement
  const runConfigCollection = useMemo(
    () => buildRunConfigurationCollection(collection, item),
    [collection, item]
  );

  return (
    <StyledWrapper>
      <Modal size="lg" title="Collection Runner" hideFooter={true} handleCancel={onClose}>
        <div className="flex gap-4">
          <div className="w-1/2">
            <div className="mb-1" data-testid="folder-run-count">
              <span className="font-medium">Run</span>
              <span className="ml-1 text-xs">({requestCounts.folderRun} requests)</span>
            </div>
            <div className="mb-3 description">This will only run the requests in this folder.</div>
            <div className="mb-1" data-testid="folder-recursive-run-count">
              <span className="font-medium">Recursive Run</span>
              <span className="ml-1 text-xs">({requestCounts.recursiveRun} requests)</span>
            </div>
            <div className={`description ${isFolderLoading ? 'mb-2' : 'mb-4'}`}>This will run all the requests in this folder and all its subfolders.</div>
            {isFolderLoading ? <div className="mb-4 warning">Requests in this folder are still loading.</div> : null}
            {isCollectionRunInProgress ? <div className="mb-4 warning">A Collection Run is already in progress.</div> : null}

            <hr className="divider" />

            <div className="flex flex-col items-start gap-2 mb-4">
              <label htmlFor="runner-delay" className="block text-sm">Delay between requests (ms)</label>
              <input
                id="runner-delay"
                type="number"
                className="textbox w-1/2"
                placeholder="e.g. 5"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                value={delay}
                onChange={(e) => setDelay(e.target.value)}
              />
            </div>

            <RunnerTags collectionUid={collection.uid} className="mb-4" />

            <div className="flex justify-end bruno-modal-footer mt-4">
              <Button type="button" color="secondary" variant="ghost" onClick={onClose} className="mr-3">
                Cancel
              </Button>
              {
                isCollectionRunInProgress
                  ? (
                      <Button type="submit" onClick={handleViewRunner}>
                        View Run
                      </Button>
                    )
                  : (
                      <>
                        <Button
                          type="submit"
                          disabled={shouldDisableRecursiveFolderRun}
                          aria-label="Recursive Run"
                          onClick={() => onSubmit({ recursive: true, selectedRequestUids: undefined })}
                          className="mr-3"
                        >
                          Recursive Run ({requestCounts.recursiveRun})
                        </Button>
                        <Button
                          type="submit"
                          disabled={shouldDisableFolderRun}
                          aria-label="Run"
                          onClick={() => onSubmit({ recursive: false, selectedRequestUids: undefined })}
                          className="mr-3"
                        >
                          Run ({requestCounts.folderRun})
                        </Button>
                      </>
                    )
              }
            </div>
          </div>

          <div className="w-1/2 border-l pl-4 flex flex-col">
            {runConfigCollection && (
              <>
                <div className="flex-1 min-h-0">
                  <RunConfigurationPanel
                    collection={runConfigCollection}
                    selectedItems={selectedRequestItems}
                    setSelectedItems={setSelectedRequestItems}
                    tags={tags}
                    persistConfiguration={false}
                  />
                </div>

                {!isCollectionRunInProgress && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="submit"
                      disabled={selectedCount === 0}
                      onClick={() => onSubmit({
                        recursive: true,
                        selectedRequestUids: selectedRequestItems
                      })}
                    >
                      Run {selectedCount} Request{selectedCount !== 1 ? 's' : ''}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default RunCollectionItem;
