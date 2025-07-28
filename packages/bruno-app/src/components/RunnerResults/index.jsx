import React, { useState, useRef, useEffect } from 'react';
import path from 'utils/common/path';
import { useDispatch } from 'react-redux';
import { get, cloneDeep } from 'lodash';
import { runCollectionFolder, cancelRunnerExecution } from 'providers/ReduxStore/slices/collections/actions';
import { resetCollectionRunner } from 'providers/ReduxStore/slices/collections';
import { findItemInCollection, getTotalRequestCountInCollection } from 'utils/collections';
import { IconRefresh, IconCircleCheck, IconCircleX, IconCircleOff, IconCheck, IconX, IconRun } from '@tabler/icons';
import ResponsePane from './ResponsePane';
import StyledWrapper from './StyledWrapper';
import { areItemsLoading } from 'utils/collections';
import RunnerTags from './RunnerTags/index';
import { getRequestItemsForCollectionRun } from 'utils/collections/index';

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
      if (newItem.status !== 'error' && newItem.status !== 'skipped') {
        newItem.testStatus = getTestStatus(newItem.testResults);
        newItem.assertionStatus = getTestStatus(newItem.assertionResults);
        newItem.preRequestTestStatus = getTestStatus(newItem.preRequestTestResults);
        newItem.postResponseTestStatus = getTestStatus(newItem.postResponseTestResults);
      }
      return newItem;
    })
    .filter(Boolean);

  const runCollection = () => {
    dispatch(runCollectionFolder(collection.uid, null, true, Number(delay), tagsEnabled && tags));
  };

  const runAgain = () => {
    dispatch(
      runCollectionFolder(
        collection.uid,
        runnerInfo.folderUid,
        runnerInfo.isRecursive,
        Number(delay),
        tagsEnabled && tags
      )
    );
  };

  const resetRunner = () => {
    dispatch(
      resetCollectionRunner({
        collectionUid: collection.uid
      })
    );
  };

  const cancelExecution = () => {
    dispatch(cancelRunnerExecution(runnerInfo.cancelTokenUid));
  };

  const totalRequestsInCollection = getTotalRequestCountInCollection(collectionCopy);
  const passedRequests = items.filter(allTestsPassed);
  const failedRequests = items.filter(anyTestFailed);

  const skippedRequests = items.filter((item) => {
    return item.status === 'skipped';
  });
  let isCollectionLoading = areItemsLoading(collection);

  if (!items || !items.length) {
    return (
      <StyledWrapper className="px-4 pb-4">
        <div className="font-medium mt-6 title flex items-center">
          Runner
          <IconRun size={20} strokeWidth={1.5} className="ml-2" />
        </div>
        <div className="mt-6">
          You have <span className="font-medium">{totalRequestsInCollection}</span> requests in this collection.
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

        <button type="submit" className="submit btn btn-sm btn-secondary mt-6" disabled={shouldDisableCollectionRun} onClick={runCollection}>
          Run Collection
        </button>

        <button className="submit btn btn-sm btn-close mt-6 ml-3" onClick={resetRunner}>
          Reset
        </button>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="px-4 pb-4 flex flex-grow flex-col relative overflow-auto">
      <div className="flex flex-row">
        <div className="font-medium my-6 title flex items-center">
          Runner
          <IconRun size={20} strokeWidth={1.5} className="ml-2" />
        </div>
        {runnerInfo.status !== 'ended' && runnerInfo.cancelTokenUid && (
          <button className="btn ml-6 my-4 btn-sm btn-danger" onClick={cancelExecution}>
            Cancel Execution
          </button>
        )}
      </div>
      <div className="flex flex-row gap-4 h-[calc(100%_-_4.375rem)]">
        <div
          className="flex flex-col flex-1 overflow-y-auto w-full"
          ref={runnerBodyRef}
        >
          <div className="pb-2 font-medium test-summary">
            Total Requests: {items.length}, Passed: {passedRequests.length}, Failed: {failedRequests.length}, Skipped:{' '}
            {skippedRequests.length}
          </div>
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
          
          {items.map((item) => {
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
                      :null}
                      {anyTestFailed(item) ? 
                        <IconCircleX className="test-failure" size={20} strokeWidth={1.5} />
                      :null}
                    </span>
                    <span
                      className={`mr-1 ml-2 ${item.status == 'skipped' ? 'skipped-request' : anyTestFailed(item) ? 'danger'  : ''}`}
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
                    {item.preRequestTestResults
                      ? item.preRequestTestResults.map((result) => (
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
                      ? item.postResponseTestResults.map((result) => (
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
                      ? item.testResults.map((result) => (
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
                    {item.assertionResults?.map((result) => (
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
          {runnerInfo.status === 'ended' ? (
            <div className="mt-2 mb-4">
              <button type="submit" className="submit btn btn-sm btn-secondary mt-6" onClick={runAgain}>
                Run Again
              </button>
              <button type="submit" className="submit btn btn-sm btn-secondary mt-6 ml-3" disabled={shouldDisableCollectionRun} onClick={runCollection}>
                Run Collection
              </button>
              <button className="btn btn-sm btn-close mt-6 ml-3" onClick={resetRunner}>
                Reset
              </button>
            </div>
          ) : null}
        </div>
        {selectedItem ? (
          <div className="flex flex-1 w-[50%] overflow-y-auto">
            <div className="flex flex-col w-full overflow-hidden">
              <div className="flex items-center mb-4 font-medium">
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
              <ResponsePane item={selectedItem} collection={collection} />
            </div>
          </div>
        ) : null}
      </div>
    </StyledWrapper>
  );
}
