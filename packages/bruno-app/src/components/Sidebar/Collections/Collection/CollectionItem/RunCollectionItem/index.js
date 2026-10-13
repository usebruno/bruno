import React, { useMemo, useState } from 'react';
import get from 'lodash/get';
import { uuid } from 'utils/common';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import useClearStoredRunnerExchanges from 'hooks/useClearStoredRunnerExchanges';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { runCollectionFolder } from 'providers/ReduxStore/slices/collections/actions';
import { updateRunnerIterationConfig } from 'providers/ReduxStore/slices/collections';
import { flattenItems } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { areItemsLoading } from 'utils/collections';
import RunnerTags from 'components/RunnerResults/RunnerTags/index';
import RunnerDataFile from 'components/RunnerResults/RunnerDataFile';
import { DEFAULT_ITERATION_CONFIG, isIterationsValid, toRunIterationConfig } from 'utils/collections/runner-iterations';
import { getEffectiveTagsForItem, getRequestItemsForCollectionRun } from 'utils/collections/index';
import Button from 'ui/Button';

// stable reference, so an unset runnerTags doesn't invalidate the run counts on every render
const NO_RUNNER_TAGS = { include: [], exclude: [] };

const RunCollectionItem = ({ collectionUid, item, onClose }) => {
  const dispatch = useDispatch();
  const [delay, setDelay] = useState('');

  const collection = useSelector((state) => state.collections.collections?.find((c) => c.uid === collectionUid));
  const [iterationConfig, setIterationConfig] = useState(
    () => get(collection, 'runnerConfiguration.iterationConfig', DEFAULT_ITERATION_CONFIG)
  );
  const areIterationsValid = isIterationsValid(iterationConfig.iterations);
  const isCollectionRunInProgress = collection?.runnerResult?.info?.status && (collection?.runnerResult?.info?.status !== 'ended');

  // tags for the collection run
  const tags = get(collection, 'runnerTags', NO_RUNNER_TAGS);

  const clearStoredRunnerExchanges = useClearStoredRunnerExchanges(collection.uid);

  const onSubmit = async (recursive) => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-runner'
      })
    );
    if (!isCollectionRunInProgress) {
      // kept so the Runner tab's "Run Again" repeats the run with the same data
      dispatch(updateRunnerIterationConfig({ collectionUid: collection.uid, iterationConfig }));
      await clearStoredRunnerExchanges();
      dispatch(runCollectionFolder(collection.uid, item ? item.uid : null, recursive, delay ? Number(delay) : null, tags, null, toRunIterationConfig(iterationConfig)));
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

  // two full tree walks, so they are held across the re-renders driven by the delay input
  const requestCounts = useMemo(() => {
    const inheritedTags = item ? getEffectiveTagsForItem(collection, item) : [];
    return {
      recursiveRun: getRequestItemsForCollectionRun({ recursive: true, tags, items, inheritedTags }).length,
      folderRun: getRequestItemsForCollectionRun({ recursive: false, tags, items, inheritedTags }).length
    };
  }, [collection, item, items, tags]);

  const shouldDisableRecursiveFolderRun = requestCounts.recursiveRun <= 0;
  const shouldDisableFolderRun = requestCounts.folderRun <= 0;

  return (
    <StyledWrapper>
      <Modal size="md" title="Collection Runner" hideFooter={true} handleCancel={onClose}>
        <div>
          <div className="mb-1" data-testid="folder-run-count">
            <span className="font-medium">Run</span>
            <span className="ml-1 text-xs">({requestCounts.folderRun} requests)</span>
          </div>
          <div className="mb-3 description">This will only run the requests in this folder.</div>
          <div className="mb-1" data-testid="folder-recursive-run-count">
            <span className="font-medium">Recursive Run</span>
            <span className="ml-1 text-xs">({requestCounts.recursiveRun} requests)</span>
          </div>
          <div className={`description ${isFolderLoading ? 'mb-2' : 'mb-6'}`}>This will run all the requests in this folder and all its subfolders.</div>
          {isFolderLoading ? <div className="mb-8 warning">Requests in this folder are still loading.</div> : null}
          {isCollectionRunInProgress ? <div className="mb-6 warning">A Collection Run is already in progress.</div> : null}

          <hr className="divider" />

          {/* Timings */}
          <div className="flex flex-col items-start gap-2 mb-8">
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

          {/* Tags for the collection run */}
          <RunnerTags collectionUid={collection.uid} className="mb-6" />

          {/* Data-driven iterations */}
          <div className="flex flex-col items-start gap-2 mb-6">
            <span className="block text-sm">Data file</span>
            <div className="w-full">
              <RunnerDataFile
                dataFile={iterationConfig.dataFile}
                onChange={(dataFile) => setIterationConfig({ ...iterationConfig, dataFile })}
              />
            </div>
            <label htmlFor="runner-iterations" className="block text-sm mt-2">Iterations</label>
            <input
              id="runner-iterations"
              type="number"
              min="1"
              step="1"
              className="textbox w-1/2"
              placeholder={iterationConfig.dataFile ? `${Math.max(iterationConfig.dataFile.rowCount, 1)} (one per row)` : '1'}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-testid="run-collection-iterations-input"
              value={iterationConfig.iterations}
              onChange={(e) => setIterationConfig({ ...iterationConfig, iterations: e.target.value })}
            />
            {!areIterationsValid ? (
              <div className="warning text-xs">Iterations must be a whole number of at least 1</div>
            ) : null}
          </div>

          <div className="flex justify-end bruno-modal-footer">
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
                      <Button type="submit" disabled={shouldDisableRecursiveFolderRun || !areIterationsValid} onClick={() => onSubmit(true)} className="mr-3">
                        Recursive Run
                      </Button>
                      <Button type="submit" disabled={shouldDisableFolderRun || !areIterationsValid} onClick={() => onSubmit(false)}>
                        Run
                      </Button>
                    </>
                  )
            }
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default RunCollectionItem;
