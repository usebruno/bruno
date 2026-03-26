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

  useEffect(() => {
    const savedConfiguration = get(collection, 'runnerConfiguration', null);
    if (savedConfiguration) {
      if (savedConfiguration.delay !== undefined && delay === null) {
        setDelay(savedConfiguration.delay);
      }
    }
  }, [collection.runnerConfiguration, delay]);

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

  const runCollection = () => {
    dispatch(updateRunnerConfiguration(collection.uid, selectedRequestItems, selectedRequestItems, delay));
    dispatch(runCollectionFolder(collection.uid, null, true, Number(delay), tags, selectedRequestItems));
  };

  const runAgain = () => {
    ensureCollectionIsMounted();
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
        savedSelectedItems
      )
    );
  };

  const resetRunner = () => {
    dispatch(
      resetCollectionRunner({
        collectionUid: collection.uid
      })
    );
    setDelay(null);
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
  if (!items || !items.length) {
    return (
      <StyledWrapper className="pl-4 overflow-hidden h-full">
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

            {/* Timings */}
            <div className="runner-section-title mt-6">Timings</div>
            <div className="runner-section mt-2">
              <label>Delay between requests (ms)</label>
              <input
                type="number"
                className="block textbox w-full mt-2"
                placeholder="e.g. 5"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-testid="runner-delay-input"
                value={delay}
                onChange={(e) => setDelay(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="runner-section-title mt-6">Filters</div>
            <div className="runner-section mt-2 mb-6">
              {/* Tags for the collection run */}
              <RunnerTags collectionUid={collection.uid} />
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
            {filteredItems.map((item) => {
              return (
                <div key={item.uid}>
                  <div className="item-path mt-2">
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
