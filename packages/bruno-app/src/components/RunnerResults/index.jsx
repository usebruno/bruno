import React, { useState, useRef, useEffect } from 'react';
import path from 'utils/common/path';
import { useDispatch } from 'react-redux';
import { get, cloneDeep } from 'lodash';
import { runCollectionFolder, cancelRunnerExecution, mountCollection, updateRunnerConfiguration } from 'providers/ReduxStore/slices/collections/actions';
import { resetCollectionRunner } from 'providers/ReduxStore/slices/collections';
import { findItemInCollection, getTotalRequestCountInCollection, areItemsLoading } from 'utils/collections';
import { IconRefresh, IconCircleCheck, IconCircleX, IconCircleOff, IconCheck, IconX, IconRun, IconExternalLink } from '@tabler/icons';
import ResponsePane from './ResponsePane';
import StyledWrapper from './StyledWrapper';
import RunnerTags from './RunnerTags/index';
import RunConfigurationPanel from './RunConfigurationPanel';
import IterationDataModal from './IterationDataModal';
import Button from 'ui/Button/index';

const getDisplayName = (fullPath, pathname, name = '') => {
  let relativePath = path.relative(fullPath, pathname);
  const { dir = '' } = path.parse(relativePath);
  return path.join(dir, name);
};

const getTestStatus = (results) => {
  if (!results || !results.length) return 'pass';
  const failed = results.filter((result) => result.status === 'fail');
  return failed.length ? 'fail' : 'pass';
};

const allTestsPassed = (item) => {
  return item.status !== 'error'
    && item.testStatus === 'pass'
    && item.assertionStatus === 'pass'
    && item.preRequestTestStatus === 'pass'
    && item.postResponseTestStatus === 'pass';
};

const anyTestFailed = (item) => {
  return item.status === 'error'
    || item.testStatus === 'fail'
    || item.assertionStatus === 'fail'
    || item.preRequestTestStatus === 'fail'
    || item.postResponseTestStatus === 'fail';
};

// === Centralized filters definition ===
const FILTERS = {
  all: {
    label: 'All',
    predicate: () => true,
    resultFilter: (results) => results
  },
  passed: {
    label: 'Passed',
    predicate: (item) => allTestsPassed(item),
    resultFilter: (results) => results?.filter((r) => r.status === 'pass')
  },
  failed: {
    label: 'Failed',
    predicate: (item) => anyTestFailed(item),
    resultFilter: (results) => results?.filter((r) => ['fail', 'error'].includes(r.status))
  },
  skipped: {
    label: 'Skipped',
    predicate: (item) => item.status === 'skipped',
    resultFilter: (results) => results
  }
};

// === Reusable filter button ===
const FilterButton = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={`filter-button ${active ? 'active' : ''}`}
  >
    {label}
    <span className="filter-count">{count}</span>
  </button>
);

export default function RunnerResults({ collection }) {
  const dispatch = useDispatch();
  const [selectedItem, setSelectedItem] = useState(null);
  const [delay, setDelay] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedRequestItems, setSelectedRequestItems] = useState([]);
  const [iterationDataFile, setIterationDataFile] = useState(null); // { filePath, rows }
  const [iterationDataPending, setIterationDataPending] = useState(null); // preview before confirm
  const [iterationCount, setIterationCount] = useState('');
  const [advancedSettings, setAdvancedSettings] = useState({
    persistResponses: true,
    disableLogs: false,
    bail: false,
    keepVariableValues: false,
    disableCookies: false,
    saveCookiesAfterRun: true
  });
  const isReRunningRef = useRef(false);
  // ref for the runner output body
  const runnerBodyRef = useRef();

  const collectionCopy = cloneDeep(collection);
  const runnerInfo = get(collection, 'runnerResult.info', {});

  // tags for the collection run
  const tags = get(collection, 'runnerTags', { include: [], exclude: [] });

  // have tags been added for the collection run
  const areTagsAdded = tags.include.length > 0 || tags.exclude.length > 0;

  const items = cloneDeep(get(collection, 'runnerResult.items', []))
    .map((item) => {
      const info = findItemInCollection(collectionCopy, item.uid);
      if (!info) {
        return null;
      }
      const newItem = {
        ...item,
        name: info.name,
        type: info.type,
        filename: info.filename,
        pathname: info.pathname,
        displayName: getDisplayName(collection.pathname, info.pathname, info.name),
        tags: [...(info.request?.tags || [])].sort()
      };
      if (newItem.status !== 'error' && newItem.status !== 'skipped' && newItem.status !== 'running') {
        newItem.testStatus = getTestStatus(newItem.testResults);
        newItem.assertionStatus = getTestStatus(newItem.assertionResults);
        newItem.preRequestTestStatus = getTestStatus(newItem.preRequestTestResults);
        newItem.postResponseTestStatus = getTestStatus(newItem.postResponseTestResults);
      }
      return newItem;
    })
    .filter(Boolean);

  const activeFilterConfig = FILTERS[activeFilter];
  const filteredItems = items.filter(activeFilterConfig.predicate);

  const filterTestResults = (results) => {
    if (!results || !Array.isArray(results)) return [];
    return activeFilterConfig.resultFilter(results);
  };

  const autoScrollRunnerBody = () => {
    if (runnerBodyRef?.current) {
      const element = runnerBodyRef.current;
      const scrollThreshold = 100; // pixels from bottom to consider "at bottom"
      const isNearBottom
        = element.scrollHeight - element.scrollTop - element.clientHeight < scrollThreshold;

      // Only auto-scroll if user is already near the bottom
      if (isNearBottom) {
        // mimics the native terminal scroll style
        element.scrollTo(0, 100000);
      }
    }
  };

  useEffect(() => {
    if (!collection.runnerResult) {
      setSelectedItem(null);
    }
    autoScrollRunnerBody();
  }, [collection, setSelectedItem]);

  useEffect(() => {
    // Auto-scroll when items are added or updated during execution
    // Only scrolls if user is already at/near the bottom
    if (filteredItems.length > 0) {
      autoScrollRunnerBody();
    }
  }, [filteredItems]);

  // Restore runner config on mount
  useEffect(() => {
    const savedConfiguration = get(collection, 'runnerConfiguration', null);
    if (savedConfiguration) {
      if (savedConfiguration.delay !== undefined && delay === null) {
        setDelay(savedConfiguration.delay);
      }
      if (savedConfiguration.iterationDataFile !== undefined) {
        setIterationDataFile(savedConfiguration.iterationDataFile);
      }
      if (savedConfiguration.iterationCount !== undefined) {
        setIterationCount(savedConfiguration.iterationCount);
      }
      if (savedConfiguration.advancedSettings !== undefined) {
        setAdvancedSettings(savedConfiguration.advancedSettings);
      }
    }
  }, []);

  // Auto-save runner config to Redux whenever settings change
  useEffect(() => {
    const savedConfiguration = get(collection, 'runnerConfiguration', null);
    const savedOrder = savedConfiguration?.requestItemsOrder || selectedRequestItems;
    dispatch(updateRunnerConfiguration(
      collection.uid,
      selectedRequestItems,
      savedOrder,
      delay,
      advancedSettings,
      iterationDataFile,
      iterationCount
    ));
  }, [iterationDataFile, iterationCount, advancedSettings, delay]);

  useEffect(() => {
    if (isReRunningRef.current
      && (items?.length > 0 || runnerInfo?.status === 'ended' || runnerInfo?.status === 'cancelled')) {
      isReRunningRef.current = false;
    }
  }, [items, runnerInfo?.status]);

  const ensureCollectionIsMounted = () => {
    if (collection.mountStatus === 'mounted') {
      return;
    }
    dispatch(mountCollection({
      collectionUid: collection.uid,
      collectionPathname: collection.pathname,
      brunoConfig: collection.brunoConfig
    }));
  };

  const selectIterationDataFile = async () => {
    const { ipcRenderer } = window;
    try {
      const result = await ipcRenderer.invoke('renderer:load-iteration-data-file');
      if (result) {
        setIterationDataPending(result);
      }
    } catch (err) {
      console.error('Failed to load iteration data file:', err);
    }
  };

  const confirmIterationDataFile = () => {
    setIterationDataFile(iterationDataPending);
    setIterationDataPending(null);
    setIterationCount(String(iterationDataPending.rows.length));
  };

  const cancelIterationDataFile = () => {
    setIterationDataPending(null);
  };

  const clearIterationDataFile = () => {
    setIterationDataFile(null);
    setIterationCount('');
  };

  const getIterationData = () => {
    const n = parseInt(iterationCount, 10);
    const count = !isNaN(n) && n > 0 ? n : 1;

    if (iterationDataFile && iterationDataFile.rows.length > 0) {
      // If user typed a count lower than file rows, slice; if higher, cycle through rows
      return Array.from({ length: count }, (_, i) => iterationDataFile.rows[i % iterationDataFile.rows.length]);
    }

    if (count > 1) {
      return Array.from({ length: count }, () => ({}));
    }
    return null;
  };

  const runCollection = () => {
    dispatch(runCollectionFolder(collection.uid, null, true, Number(delay), tags, selectedRequestItems, getIterationData(), advancedSettings));
  };

  const runAgain = () => {
    ensureCollectionIsMounted();
    isReRunningRef.current = true;
    // Get the saved configuration to determine what to run
    const savedConfiguration = get(collection, 'runnerConfiguration', null);
    const savedSelectedItems = savedConfiguration?.selectedRequestItems || [];
    const savedDelay = savedConfiguration?.delay !== undefined ? savedConfiguration.delay : delay;
    dispatch(
      runCollectionFolder(
        collection.uid,
        runnerInfo.folderUid,
        true,
        Number(savedDelay),
        tags,
        savedSelectedItems,
        getIterationData()
      )
    );
  };

  const modifyRunner = () => {
    isReRunningRef.current = false;
    dispatch(
      resetCollectionRunner({
        collectionUid: collection.uid
      })
    );
    // preserves iterationDataFile, iterationCount, delay and advancedSettings
  };

  const resetRunner = () => {
    isReRunningRef.current = false;
    dispatch(
      resetCollectionRunner({
        collectionUid: collection.uid
      })
    );
    setDelay(null);
    setIterationDataFile(null);
    setIterationCount('');
  };

  const cancelExecution = () => {
    dispatch(cancelRunnerExecution(runnerInfo.cancelTokenUid));
  };

  const totalRequestsInCollection = getTotalRequestCountInCollection(collectionCopy);
  const filterCounts = {
    all: items.length,
    passed: items.filter(allTestsPassed).length,
    failed: items.filter(anyTestFailed).length,
    skipped: items.filter((i) => i.status === 'skipped').length
  };

  let isCollectionLoading = areItemsLoading(collection);
  if ((!items || !items.length) && !isReRunningRef.current) {
    return (
      <StyledWrapper className="pl-4 overflow-hidden h-full">
        {iterationDataPending && (
          <IterationDataModal
            data={iterationDataPending}
            onConfirm={confirmIterationDataFile}
            onCancel={cancelIterationDataFile}
            previewOnly={iterationDataFile !== null}
          />
        )}
        <div className="flex overflow-hidden max-h-full h-full">
          <div className="w-1/2 pr-4">
            <div className="font-medium mt-6 title flex items-center">
              <IconRun size={20} strokeWidth={1.5} className="mr-2" />
              Runner
            </div>
            <div className="mt-2">
              You have <span className="font-medium text-xs">{totalRequestsInCollection}</span> {totalRequestsInCollection === 1 ? 'request' : 'requests'} in this collection.
              {isCollectionLoading && (
                <span className="ml-2 text-muted">
                  (Loading...)
                </span>
              )}
            </div>
            {isCollectionLoading ? <div className="my-1 danger">Requests in this collection are still loading.</div> : null}

            {/* Run configuration */}
            <div className="run-config-section mt-6">
              <div className="runner-section-title run-config-heading">Run configuration</div>

              {/* Iterations + Delay side by side */}
              <div className="flex gap-4 mt-3 items-start">
                <div className="flex-1">
                  <div className="runner-section-title">Iterations</div>
                  <div className="runner-section mt-2">
                    <input
                      type="number"
                      className="block textbox w-full"
                      placeholder="1"
                      min="1"
                      autoComplete="off"
                      data-testid="runner-iteration-count-input"
                      value={iterationCount}
                      onChange={(e) => setIterationCount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="runner-section-title">Delay</div>
                  <div className="runner-section mt-2">
                    <div className="textbox-with-suffix">
                      <input
                        type="number"
                        className="textbox"
                        placeholder="0"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        data-testid="runner-delay-input"
                        value={delay}
                        onChange={(e) => setDelay(e.target.value)}
                      />
                      <span className="textbox-suffix">ms</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test data file */}
              <div className="mt-4">
                <div className="runner-section-title">Test data file</div>
                <div className="runner-section mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={selectIterationDataFile}
                    data-testid="runner-iteration-data-btn"
                  >
                    {iterationDataFile ? 'Change File' : 'Select File'}
                  </Button>

                  {iterationDataFile && (
                    <div className="iteration-file-loaded">
                      <div className="iteration-file-info">
                        <span className="iteration-file-name" title={iterationDataFile.filePath}>
                          {iterationDataFile.filePath.split(/[\\/]/).pop()}
                        </span>
                        <span className="iteration-file-meta">
                          {iterationDataFile.rows.length} row{iterationDataFile.rows.length !== 1 ? 's' : ''}
                          {' · '}
                          {Object.keys(iterationDataFile.rows[0] || {}).length} variable{Object.keys(iterationDataFile.rows[0] || {}).length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="iteration-file-actions">
                        <button onClick={() => setIterationDataPending(iterationDataFile)} title="Preview data">
                          Preview
                        </button>
                        <button
                          className="btn-remove"
                          onClick={clearIterationDataFile}
                          data-testid="runner-iteration-data-remove"
                          title="Remove"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="runner-section-title mt-6">Filters</div>
            <div className="runner-section mt-2 mb-6">
              <RunnerTags collectionUid={collection.uid} />
            </div>

            {/* Advanced Settings */}
            <div className="runner-section-title mt-2">Advanced Settings</div>
            <div className="runner-section mt-2 mb-6">
              <div className="advanced-settings-list">
                {[
                  { key: 'persistResponses', label: 'Persist responses for a session' },
                  { key: 'disableLogs', label: 'Turn off logs during run' },
                  { key: 'bail', label: 'Stop run if an error occurs' },
                  { key: 'keepVariableValues', label: 'Keep variable values' },
                  { key: 'disableCookies', label: 'Run collection without using stored cookies' },
                  { key: 'saveCookiesAfterRun', label: 'Save cookies after collection run' }
                ].map(({ key, label }) => (
                  <label key={key} className="advanced-setting-row">
                    <input
                      type="checkbox"
                      checked={advancedSettings[key]}
                      onChange={(e) =>
                        setAdvancedSettings((prev) => ({ ...prev, [key]: e.target.checked }))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-row gap-2">
              <Button
                type="submit"
                data-testid="runner-run-button"
                disabled={selectedRequestItems.length === 0 || isCollectionLoading}
                onClick={runCollection}
              >
                Run {selectedRequestItems.length} Request{selectedRequestItems.length !== 1 ? 's' : ''}
              </Button>

              <Button type="button" variant="ghost" onClick={resetRunner}>
                Reset
              </Button>
            </div>
          </div>

          <div className="run-config-panel w-1/2 border-l">
            <RunConfigurationPanel
              collection={collection}
              selectedItems={selectedRequestItems}
              setSelectedItems={setSelectedRequestItems}
              tags={tags}
            />
          </div>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="px-4 pb-4 flex flex-grow flex-col relative overflow-auto">
      {/* Filter Bar and Actions */}
      <div className="flex items-center justify-between mb-4 pt-[14px] gap-4">
        <div className="filter-bar">
          <div className="filter-label">
            <span>Filter by:</span>
          </div>
          <div className="filter-buttons">
            {Object.entries(FILTERS).map(([key, { label }]) => (
              <FilterButton
                key={key}
                label={label}
                count={filterCounts[key]}
                active={activeFilter === key}
                onClick={() => setActiveFilter(key)}
              />
            ))}
          </div>
        </div>

        {runnerInfo.status !== 'ended' && runnerInfo.cancelTokenUid ? (
          <div className="flex items-center flex-shrink-0">
            <Button
              type="button"
              onClick={cancelExecution}
              size="sm"
              variant="filled"
              color="danger"
            >
              Cancel Execution
            </Button>
          </div>
        ) : runnerInfo.status === 'ended' ? (
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              type="button"
              onClick={runAgain}
              size="sm"
              variant="filled"
              color="secondary"
            >
              Run Again
            </Button>
            <Button
              type="button"
              onClick={modifyRunner}
              size="sm"
              variant="filled"
              color="secondary"
            >
              Modify
            </Button>
            <Button
              type="button"
              onClick={resetRunner}
              size="sm"
              variant="filled"
              color="secondary"
            >
              Reset
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex gap-4 h-[calc(100vh_-_10rem)] overflow-hidden">
        <div
          className="flex flex-col w-1/2"
        >
          {areTagsAdded && (
            <div className="pb-2 text-xs flex flex-row gap-1">
              Tags:
              <div className="flex flex-row items-center gap-x-2">
                <div className="text-green">
                  {tags.include.join(', ')}
                </div>
                <div className="text-muted">
                  {tags.exclude.join(', ')}
                </div>
              </div>
            </div>
          )}
          {runnerInfo?.statusText
            ? (
                <div className="pb-2 font-medium danger">
                  {runnerInfo?.statusText}
                </div>
              )
            : null}

          {/* Items list */}
          <div className="overflow-y-auto flex-1 " ref={runnerBodyRef}>
            {filteredItems.map((item, idx) => {
              const totalIterations = runnerInfo?.totalIterations || 1;
              const showIterationBadge = totalIterations > 1 && item.iterationIndex !== undefined;
              return (
                <div key={`${item.uid}-${item.iterationIndex ?? 0}-${idx}`}>
                  <div className="item-path mt-2" data-testid="runner-result-item">
                    <div className="flex items-center">
                      <span>
                        {allTestsPassed(item)
                          ? <IconCircleCheck className="test-success" size={20} strokeWidth={1.5} />
                          : null}
                        {item.status === 'skipped'
                          ? <IconCircleOff className="skipped-request" size={20} strokeWidth={1.5} />
                          : null}
                        {anyTestFailed(item)
                          ? <IconCircleX className="test-failure" size={20} strokeWidth={1.5} />
                          : null}
                      </span>
                      <span
                        className={`mr-1 ml-2 ${item.status == 'skipped' ? 'skipped-request' : anyTestFailed(item) ? 'danger' : ''}`}
                      >
                        {item.displayName}
                      </span>
                      {showIterationBadge && (
                        <span className="text-xs text-muted ml-1 mr-1">
                          [#{item.iterationIndex + 1}]
                        </span>
                      )}
                      {item.status !== 'error' && item.status !== 'skipped' && item.status !== 'completed' ? (
                        <IconRefresh className="animate-spin ml-1" size={18} strokeWidth={1.5} />
                      ) : item.responseReceived?.status ? (
                        <span className="text-xs link cursor-pointer" onClick={() => setSelectedItem(item)}>
                          <span className="mr-1">{item.responseReceived?.status}</span>
                          -&nbsp;
                          <span>{item.responseReceived?.statusText}</span>
                        </span>
                      ) : (
                        <span className="danger text-xs cursor-pointer" onClick={() => setSelectedItem(item)}>
                          (request failed)
                        </span>
                      )}
                    </div>
                    {areTagsAdded && item?.tags?.length > 0 && (
                      <div className="pl-7 text-xs text-muted">
                        Tags: {item.tags.filter((t) => tags.include.includes(t)).join(', ')}
                      </div>
                    )}
                    {item.status == 'error' ? <div className="error-message pl-8 pt-2 text-xs">{item.error}</div> : null}

                    <ul className="pl-8">
                      {item.preRequestTestResults
                        ? filterTestResults(item.preRequestTestResults).map((result) => (
                            <li key={result.uid}>
                              {result.status === 'pass' ? (
                                <span className="test-success flex items-center">
                                  <IconCheck size={18} strokeWidth={2} className="mr-2" />
                                  {result.description}
                                </span>
                              ) : (
                                <>
                                  <span className="test-failure flex items-center">
                                    <IconX size={18} strokeWidth={2} className="mr-2" />
                                    {result.description}
                                  </span>
                                  <span className="error-message pl-8 text-xs">{result.error}</span>
                                </>
                              )}
                            </li>
                          ))
                        : null}
                      {item.postResponseTestResults
                        ? filterTestResults(item.postResponseTestResults).map((result) => (
                            <li key={result.uid}>
                              {result.status === 'pass' ? (
                                <span className="test-success flex items-center">
                                  <IconCheck size={18} strokeWidth={2} className="mr-2" />
                                  {result.description}
                                </span>
                              ) : (
                                <>
                                  <span className="test-failure flex items-center">
                                    <IconX size={18} strokeWidth={2} className="mr-2" />
                                    {result.description}
                                  </span>
                                  <span className="error-message pl-8 text-xs">{result.error}</span>
                                </>
                              )}
                            </li>
                          ))
                        : null}
                      {item.testResults
                        ? filterTestResults(item.testResults).map((result) => (
                            <li key={result.uid}>
                              {result.status === 'pass' ? (
                                <span className="test-success flex items-center">
                                  <IconCheck size={18} strokeWidth={2} className="mr-2" />
                                  {result.description}
                                </span>
                              ) : (
                                <>
                                  <span className="test-failure flex items-center">
                                    <IconX size={18} strokeWidth={2} className="mr-2" />
                                    {result.description}
                                  </span>
                                  <span className="error-message pl-8 text-xs">{result.error}</span>
                                </>
                              )}
                            </li>
                          ))
                        : null}
                      {filterTestResults(item.assertionResults).map((result) => (
                        <li key={result.uid}>
                          {result.status === 'pass' ? (
                            <span className="test-success flex items-center">
                              <IconCheck size={18} strokeWidth={2} className="mr-2" />
                              {result.lhsExpr}: {result.rhsExpr}
                            </span>
                          ) : (
                            <>
                              <span className="test-failure flex items-center">
                                <IconX size={18} strokeWidth={2} className="mr-2" />
                                {result.lhsExpr}: {result.rhsExpr}
                              </span>
                              <span className="error-message pl-8 text-xs">{result.error}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedItem ? (
          <div className="flex flex-1 w-[50%] overflow-y-auto">
            <div className="flex flex-col w-full overflow-hidden">
              <div className="flex items-center justify-between mb-4 font-medium">
                <div className="flex items-center">
                  <span className="mr-2">{selectedItem.displayName}</span>
                  <span>
                    {allTestsPassed(selectedItem)
                      ? <IconCircleCheck className="test-success" size={20} strokeWidth={1.5} />
                      : null}
                    {anyTestFailed(selectedItem)
                      ? <IconCircleX className="test-failure" size={20} strokeWidth={1.5} />
                      : null}
                    {selectedItem.status === 'skipped'
                      ? <IconCircleOff className="skipped-request" size={20} strokeWidth={1.5} />
                      : null}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded hover-bg-surface transition-colors cursor-pointer flex items-center justify-center"
                  title="Close"
                  aria-label="Close response view"
                >
                  <IconX size={16} strokeWidth={1.5} />
                </button>
              </div>
              <ResponsePane item={selectedItem} collection={collection} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 w-[50%] overflow-y-auto">
            <div className="flex flex-col w-full h-full items-center justify-center text-center">
              <div className="mb-4 text-subtext0">
                <IconExternalLink size={64} strokeWidth={1.5} />
              </div>
              <p className="text-subtext1">
                Click on the status code to view the response
              </p>
            </div>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
}
