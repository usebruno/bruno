import React, { useState } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { uuid } from 'utils/common';
import Modal from 'components/Modal';
import useClearStoredRunnerExchanges from 'hooks/useClearStoredRunnerExchanges';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { runCollectionFolder, updateRunnerConfiguration } from 'providers/ReduxStore/slices/collections/actions';
import RunnerDataFile from 'components/RunnerResults/RunnerDataFile';
import { DEFAULT_ITERATION_CONFIG, isIterationsValid, toRunIterationConfig } from 'utils/collections/runner-iterations';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

// The request is picked explicitly, so the runner's tag filters must not drop it
const NO_RUNNER_TAGS = { include: [], exclude: [] };

/**
 * Runs a single request once per row of a CSV/JSON data file, through the collection runner.
 */
const RunRequestWithData = ({ collectionUid, item, onClose }) => {
  const dispatch = useDispatch();
  const collection = useSelector((state) => state.collections.collections?.find((c) => c.uid === collectionUid));
  const [iterationConfig, setIterationConfig] = useState(
    () => get(collection, 'runnerConfiguration.iterationConfig', DEFAULT_ITERATION_CONFIG)
  );
  const clearStoredRunnerExchanges = useClearStoredRunnerExchanges(collection.uid);

  const isCollectionRunInProgress = collection?.runnerResult?.info?.status && (collection?.runnerResult?.info?.status !== 'ended');
  const areIterationsValid = isIterationsValid(iterationConfig.iterations);
  const canRun = Boolean(iterationConfig.dataFile) && areIterationsValid && !isCollectionRunInProgress;

  const openRunner = () => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-runner'
      })
    );
  };

  const onRun = async () => {
    openRunner();
    // saved so the Runner tab's "Run Again" repeats this single-request run with the same data
    const requestItemsOrder = get(collection, 'runnerConfiguration.requestItemsOrder', []);
    dispatch(updateRunnerConfiguration(collection.uid, [item.uid], requestItemsOrder, undefined, iterationConfig));
    await clearStoredRunnerExchanges();
    dispatch(runCollectionFolder(collection.uid, null, true, null, NO_RUNNER_TAGS, [item.uid], toRunIterationConfig(iterationConfig)));
    onClose();
  };

  const onViewRunner = () => {
    openRunner();
    onClose();
  };

  return (
    <StyledWrapper>
      <Modal size="md" title="Run with Data File" hideFooter={true} handleCancel={onClose}>
        <div data-testid="run-request-with-data">
          <div className="mb-1 font-medium truncate" title={item.name}>{item.name}</div>
          <div className="mb-6 description">Runs this request once per row of the data file. Each column is available as a {'{{variable}}'} and through bru.getIterationData().</div>

          {isCollectionRunInProgress ? <div className="mb-6 warning">A Collection Run is already in progress.</div> : null}

          <div className="flex flex-col items-start gap-2 mb-6">
            <span className="block text-sm">Data file</span>
            <div className="w-full">
              <RunnerDataFile
                dataFile={iterationConfig.dataFile}
                onChange={(dataFile) => setIterationConfig({ ...iterationConfig, dataFile })}
              />
            </div>
            <label htmlFor="run-request-iterations" className="block text-sm mt-2">Iterations</label>
            <input
              id="run-request-iterations"
              type="number"
              min="1"
              step="1"
              className="textbox w-1/2"
              placeholder={iterationConfig.dataFile ? `${Math.max(iterationConfig.dataFile.rowCount, 1)} (one per row)` : '1'}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-testid="run-request-iterations-input"
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
            {isCollectionRunInProgress ? (
              <Button type="button" onClick={onViewRunner}>
                View Run
              </Button>
            ) : (
              <Button type="submit" disabled={!canRun} onClick={onRun} data-testid="run-request-with-data-submit">
                Run
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default RunRequestWithData;
