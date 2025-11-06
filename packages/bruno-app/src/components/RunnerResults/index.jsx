import React, { useState, useRef, useEffect } from 'react';
import path from 'utils/common/path';
import { useDispatch } from 'react-redux';
import { get, cloneDeep } from 'lodash';
import { runCollectionFolder, cancelRunnerExecution, mountCollection, updateRunnerConfiguration } from 'providers/ReduxStore/slices/collections/actions';
import { resetCollectionRunner } from 'providers/ReduxStore/slices/collections';
import { findItemInCollection, getTotalRequestCountInCollection } from 'utils/collections';
import { IconRefresh, IconCircleCheck, IconCircleX, IconCircleOff, IconCheck, IconX, IconRun, IconLoader2, IconDownload, IconExternalLink } from '@tabler/icons';
import ResponsePane from './ResponsePane';
import StyledWrapper from './StyledWrapper';
import { areItemsLoading } from 'utils/collections';
import RunnerTags from './RunnerTags/index';
import RunConfigurationPanel from './RunConfigurationPanel';
import { getRequestItemsForCollectionRun } from 'utils/collections/index';
import { updateRunnerTagsDetails } from 'providers/ReduxStore/slices/collections/index';

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
  return item.status !== 'error' &&
    item.testStatus === 'pass' &&
    item.assertionStatus === 'pass' &&
    item.preRequestTestStatus === 'pass' &&
    item.postResponseTestStatus === 'pass';
};

const anyTestFailed = (item) => {
  return item.status === 'error' ||
    item.testStatus === 'fail' ||
    item.assertionStatus === 'fail' ||
    item.preRequestTestStatus === 'fail' ||
    item.postResponseTestStatus === 'fail';
};

export default function RunnerResults({ collection }) {
  const dispatch = useDispatch();
  const [selectedItem, setSelectedItem] = useState(null);
  const [delay, setDelay] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedRequestItems, setSelectedRequestItems] = useState([]);
  const [configureMode, setConfigureMode] = useState(false);

  const getActiveFilterPredicate = () => {
    switch (activeFilter) {
      case 'passed':
        return (item) => allTestsPassed(item);
      case 'failed':
        return (item) => anyTestFailed(item);
      case 'skipped':
        return (item) => item.status === 'skipped';
      case 'all':
      default:
        return () => true
    }
  }

  const filterTestResults = (results) => {
    if (!results || !Array.isArray(results)) return [];
    if (activeFilter === 'all') return results;
    if (activeFilter === 'passed') return results.filter(r => r.status === 'pass');
    if (activeFilter === 'failed') return results.filter(r => r.status === 'fail' || r.status === 'error');
    if (activeFilter === 'skipped') return results;
    return results;
  }

  // ref for the runner output body
  const runnerBodyRef = useRef();

  const autoScrollRunnerBody = () => {
    if (runnerBodyRef?.current) {
      // mimics the native terminal scroll style
      runnerBodyRef.current.scrollTo(0, 100000);
    }
  };

  useEffect(() => {
    if (!collection.runnerResult) {
      setSelectedItem(null);
    }
    autoScrollRunnerBody();
  }, [collection, setSelectedItem]);

  useEffect(() => {
    const runnerInfo = get(collection, 'runnerResult.info', {});
    if (runnerInfo.status === 'running') {
      setConfigureMode(false);
    }
  }, [collection.runnerResult]);

  useEffect(() => {
    const savedConfiguration = get(collection, 'runnerConfiguration', null);
    if (savedConfiguration) {
      if (savedConfiguration.selectedRequestItems && configureMode) {
        setSelectedRequestItems(savedConfiguration.selectedRequestItems);
      }
      if (savedConfiguration.delay !== undefined && delay === null) {
        setDelay(savedConfiguration.delay);
      }
    }
  }, [collection.runnerConfiguration, configureMode, delay]);

  const collectionCopy = cloneDeep(collection);
  const runnerInfo = get(collection, 'runnerResult.info', {});

  // tags for the collection run
  const tags = get(collection, 'runnerTags', { include: [], exclude: [] });

  // have tags been enabled for the collection run
  const tagsEnabled = get(collection, 'runnerTagsEnabled', false);

  // have tags been added for the collection run
  const areTagsAdded = tags.include.length > 0 || tags.exclude.length > 0;

  const requestItemsForCollectionRun = getRequestItemsForCollectionRun({ recursive: true, tags, items: collection.items });
  const totalRequestItemsCountForCollectionRun = requestItemsForCollectionRun.length;
  const shouldDisableCollectionRun = totalRequestItemsCountForCollectionRun <= 0;

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
        tags: [...(info.request?.tags || [])].sort(),
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

  const ensureCollectionIsMounted = () => {
    if(collection.mountStatus === 'mounted'){
      return;
    }
    dispatch(mountCollection({
      collectionUid: collection.uid,
      collectionPathname: collection.pathname,
      brunoConfig: collection.brunoConfig
    }));
  };

  const runCollection = () => {
    if (configureMode && selectedRequestItems.length > 0) {
      dispatch(updateRunnerConfiguration(collection.uid, selectedRequestItems, selectedRequestItems, delay));
      dispatch(runCollectionFolder(collection.uid, null, true, Number(delay), tagsEnabled && tags, selectedRequestItems));
    } else {
      dispatch(updateRunnerConfiguration(collection.uid, [], [], delay));
      dispatch(runCollectionFolder(collection.uid, null, true, Number(delay), tagsEnabled && tags));
    }
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
        tagsEnabled && tags,
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
    setSelectedRequestItems([]);
    setConfigureMode(false);
    setDelay(null);
  };

  const cancelExecution = () => {
    dispatch(cancelRunnerExecution(runnerInfo.cancelTokenUid));
  };

  const toggleConfigureMode = () => {
    dispatch(updateRunnerTagsDetails({ collectionUid: collection.uid, tagsEnabled: false }));
    setConfigureMode(!configureMode);
  };

  useEffect(() => {
    if(tagsEnabled) {
      setConfigureMode(false);
    }
  }, [tagsEnabled]);

  const totalRequestsInCollection = getTotalRequestCountInCollection(collectionCopy);
  
  const passedRequests = items.filter(allTestsPassed);
  const failedRequests = items.filter(anyTestFailed);

  const skippedRequests = items.filter((item) => {
    return item.status === 'skipped';
  });
  let isCollectionLoading = areItemsLoading(collection);

  // Calculate filter counts for unified filter
  const filterCounts = {
    all: items.length,
    passed: passedRequests.length,
    failed: failedRequests.length,
    skipped: skippedRequests.length
  };

  if (!items || !items.length) {
    return (
      <StyledWrapper className="pl-4 overflow-hidden h-full">
        <div className="flex overflow-hidden max-h-full h-full">
          <div className={`${configureMode ? 'w-1/2 pr-4' : 'w-full'}`}>
            <div className="font-medium mt-6 title flex items-center">
              Runner
              <IconRun size={20} strokeWidth={1.5} className="ml-2" />
            </div>
            <div className="mt-6">
              You have <span className="font-medium">{totalRequestsInCollection}</span> requests in this collection.
              {isCollectionLoading && (
                <span className="ml-2 text-sm text-gray-500">
                  (Loading...)
                </span>
              )}
            </div>
            {isCollectionLoading ? <div className='my-1 danger'>Requests in this collection are still loading.</div> : null}
            <div className="mt-6">
              <label>Delay (in ms)</label>
              <input
                type="number"
                className="block textbox mt-2 py-5"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                value={delay}
                onChange={(e) => setDelay(e.target.value)}
              />
            </div>

            {/* Tags for the collection run */}
            <RunnerTags collectionUid={collection.uid} className='mb-6' />

            {/* Configure requests option */}
            <div className="flex flex-col border-b pb-6 mb-6 border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  className="cursor-pointer"
                  id="filter-config"
                  type="radio"
                  name="filterMode"
                  checked={configureMode}
                  onChange={toggleConfigureMode}
                />
                <label htmlFor="filter-config" className="block font-medium">Configure requests to run</label>
              </div>
            </div>

            <div className='flex flex-row gap-2'>
              <button
                type="submit"
                className="submit btn btn-sm btn-secondary"
                disabled={shouldDisableCollectionRun || (configureMode && selectedRequestItems.length === 0) || isCollectionLoading}
                onClick={runCollection}
              >
                {configureMode && selectedRequestItems.length > 0
                  ? `Run ${selectedRequestItems.length} Selected Request${selectedRequestItems.length > 1 ? 's' : ''}`
                  : "Run Collection"
                }
              </button>

              <button className="submit btn btn-sm btn-close" onClick={resetRunner}>
                Reset
              </button>
            </div>
          </div>

          {configureMode && (
            <div className="w-1/2 border-l border-gray-200 dark:border-gray-700">
              <RunConfigurationPanel
                collection={collection}
                selectedItems={selectedRequestItems}
                setSelectedItems={setSelectedRequestItems}
              />
            </div>
          )}
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="px-4 pb-4 flex flex-grow flex-col relative overflow-auto">
      {/* Filter Bar and Action Buttons */}
      <div className="flex items-center justify-between mb-4 pt-[14px] gap-4">
        {/* Filter Bar */}
        <div className="flex items-stretch rounded-lg border border-[#EFEFEF] dark:border-[#92929233] max-h-[35px] flex-shrink-0" style={{ borderWidth: '1px' }}>
          {/* Filter by text container - left border radius only */}
          <div className="flex items-center px-3 py-2 rounded-l-lg bg-[#F3F3F3] dark:bg-[#2B2D2F]">
            <span 
              className="text-gray-600 dark:text-gray-400"
              style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%' }}
            >
              Filter by:
            </span>
          </div>
          {/* Filter buttons container - right border radius only */}
          <div className="flex items-center gap-5 px-3 pt-2 pb-0 rounded-r-lg bg-transparent dark:bg-transparent">
            <button
              onClick={() => setActiveFilter('all')}
              className={`font-medium transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 pb-2 ${
                activeFilter === 'all'
                  ? 'text-[#343434] dark:text-[#CCCCCC] border-[#F59E0B]'
                  : 'text-[#989898] dark:text-[#CCCCCC80] border-transparent'
              }`}
              style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 500, lineHeight: '100%', letterSpacing: '0%' }}
            >
              All
              <span 
                className="px-[4.5px] py-[2px] rounded-[2px] bg-[#F7F7F7] dark:bg-[#242424] border border-[#EFEFEF] dark:border-[#92929233] text-[#989898] dark:text-inherit" 
                style={{ borderWidth: '1px', fontFamily: 'Inter', fontSize: '10px', fontWeight: 500, lineHeight: '100%', letterSpacing: '0%' }}
              >
                {filterCounts.all}
              </span>
            </button>
            <button
              onClick={() => setActiveFilter('passed')}
              className={`font-medium transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 pb-2 ${
                activeFilter === 'passed'
                  ? 'text-[#343434] dark:text-[#CCCCCC] border-[#F59E0B]'
                  : 'text-[#989898] dark:text-[#CCCCCC80] border-transparent'
              }`}
              style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 500, lineHeight: '100%', letterSpacing: '0%' }}
            >
              Passed
              <span 
                className="px-[4.5px] py-[2px] rounded-[2px] bg-[#F7F7F7] dark:bg-[#242424] border border-[#EFEFEF] dark:border-[#92929233] text-[#989898] dark:text-inherit" 
                style={{ borderWidth: '1px', fontFamily: 'Inter', fontSize: '10px', fontWeight: 500, lineHeight: '100%', letterSpacing: '0%' }}
              >
                {filterCounts.passed}
              </span>
            </button>
            <button
              onClick={() => setActiveFilter('failed')}
              className={`font-medium transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 pb-2 ${
                activeFilter === 'failed'
                  ? 'text-[#343434] dark:text-[#CCCCCC] border-[#F59E0B]'
                  : 'text-[#989898] dark:text-[#CCCCCC80] border-transparent'
              }`}
              style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 500, lineHeight: '100%', letterSpacing: '0%' }}
            >
              Failed
              <span 
                className="px-[4.5px] py-[2px] rounded-[2px] bg-[#F7F7F7] dark:bg-[#242424] border border-[#EFEFEF] dark:border-[#92929233] text-[#989898] dark:text-inherit" 
                style={{ borderWidth: '1px', fontFamily: 'Inter', fontSize: '10px', fontWeight: 500, lineHeight: '100%', letterSpacing: '0%' }}
              >
                {filterCounts.failed}
              </span>
            </button>
            <button
              onClick={() => setActiveFilter('skipped')}
              className={`font-medium transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 pb-2 ${
                activeFilter === 'skipped'
                  ? 'text-[#343434] dark:text-[#CCCCCC] border-[#F59E0B]'
                  : 'text-[#989898] dark:text-[#CCCCCC80] border-transparent'
              }`}
              style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 500, lineHeight: '100%', letterSpacing: '0%' }}
            >
              Skipped
              <span 
                className="px-[4.5px] py-[2px] rounded-[2px] bg-[#F7F7F7] dark:bg-[#242424] border border-[#EFEFEF] dark:border-[#92929233] text-[#989898] dark:text-inherit" 
                style={{ borderWidth: '1px', fontFamily: 'Inter', fontSize: '10px', fontWeight: 500, lineHeight: '100%', letterSpacing: '0%' }}
              >
                {filterCounts.skipped}
              </span>
            </button>
          </div>
        </div>

        {/* Action Buttons or Cancel Execution */}
        {runnerInfo.status !== 'ended' && runnerInfo.cancelTokenUid ? (
          <div className="flex items-center flex-shrink-0">
            <button className="btn btn-sm btn-danger" onClick={cancelExecution}>
              Cancel Execution
            </button>
          </div>
        ) : runnerInfo.status === 'ended' ? (
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md bg-transparent border border-[#989898] dark:border-[#444444] text-[#989898] hover:opacity-80 transition-colors"
              style={{
                fontFamily: 'Inter',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '18px',
                letterSpacing: '0%',
                borderWidth: '1px'
              }}
              onClick={runAgain}
            >
              Run Again
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-md bg-transparent border border-[#989898] dark:border-[#444444] text-[#989898] hover:opacity-80 transition-colors"
              style={{
                fontFamily: 'Inter',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '18px',
                letterSpacing: '0%',
                borderWidth: '1px'
              }}
              onClick={resetRunner}
            >
              Reset
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex gap-4 h-[calc(100vh_-_10rem)] overflow-hidden">
        <div
          className={`flex flex-col overflow-y-auto ${selectedItem || (configureMode && !selectedItem && !runnerInfo.status === 'running') || items.length > 0 ? 'w-1/2' : 'w-full'}`}
          ref={runnerBodyRef}
        >
          {tagsEnabled && areTagsAdded && (
            <div className="pb-2 text-xs flex flex-row gap-1">
              Tags:
              <div className='flex flex-row items-center gap-x-2'>
                <div className="text-green-500">
                  {tags.include.join(', ')}
                </div>
                <div className="text-gray-500">
                  {tags.exclude.join(', ')}
                </div>
              </div>
            </div>
          )}
          {runnerInfo?.statusText ?
            <div className="pb-2 font-medium danger">
              {runnerInfo?.statusText}
            </div>
            : null}

          {/* Items list */}
          <div className="overflow-y-auto flex-1">
            {items.filter(getActiveFilterPredicate()).map((item) => {
              return (
                <div key={item.uid}>
                  <div className="item-path mt-2">
                    <div className="flex items-center">
                      <span>
                        {allTestsPassed(item) ?
                          <IconCircleCheck className="test-success" size={20} strokeWidth={1.5} />
                          : null}
                        {item.status === 'skipped' ?
                          <IconCircleOff className="skipped-request" size={20} strokeWidth={1.5} />
                          : null}
                        {anyTestFailed(item) ?
                          <IconCircleX className="test-failure" size={20} strokeWidth={1.5} />
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
                    {tagsEnabled && areTagsAdded && item?.tags?.length > 0 && (
                      <div className="pl-7 text-xs text-gray-500">
                        Tags: {item.tags.filter(t => tags.include.includes(t)).join(', ')}
                      </div>
                    )}
                    {item.status == 'error' ? <div className="error-message pl-8 pt-2 text-xs">{item.error}</div> : null}

                    <ul className="pl-8">
                      {filterTestResults(item.preRequestTestResults).map((result) => (
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
                      ))}
                      {filterTestResults(item.postResponseTestResults).map((result) => (
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
                      ))}
                      {filterTestResults(item.testResults).map((result) => (
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
                      ))}
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
                    {allTestsPassed(selectedItem) ?
                      <IconCircleCheck className="test-success" size={20} strokeWidth={1.5} />
                      : null}
                    {anyTestFailed(selectedItem) ?
                      <IconCircleX className="test-failure" size={20} strokeWidth={1.5} />
                      : null}
                    {selectedItem.status === 'skipped' ?
                      <IconCircleOff className="skipped-request" size={20} strokeWidth={1.5} />
                      : null}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer flex items-center justify-center"
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
            <div className="flex flex-col w-full h-full items-center justify-center">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 text-gray-400 dark:text-gray-500">
                  <IconExternalLink size={64} strokeWidth={1.5} />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Click on the status code to view the response
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
}
