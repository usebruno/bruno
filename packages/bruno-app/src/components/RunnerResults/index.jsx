import React, { useState, useRef, useEffect } from 'react';
import path from 'path';
import { useDispatch } from 'react-redux';
import { get, cloneDeep } from 'lodash';
import { runCollectionFolder, cancelRunnerExecution } from 'providers/ReduxStore/slices/collections/actions';
import { resetCollectionRunner } from 'providers/ReduxStore/slices/collections';
import { findItemInCollection, getTotalRequestCountInCollection } from 'utils/collections';
import { IconRefresh, IconCircleCheck, IconCircleX, IconCheck, IconX, IconRun, IconPlayerSkipForward, IconFilter, IconExternalLink } from '@tabler/icons';
import slash from 'utils/common/slash';
import ResponsePane from './ResponsePane';
import StyledWrapper from './StyledWrapper';
import { areItemsLoading } from 'utils/collections';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import toast from 'react-hot-toast';

const getRelativePath = (fullPath, pathname) => {
  // convert to unix style path
  fullPath = slash(fullPath);
  pathname = slash(pathname);

  let relativePath = path.relative(fullPath, pathname);
  const { dir, name } = path.parse(relativePath);
  return path.join(dir, name);
};

export default function RunnerResults({ collection }) {
  const dispatch = useDispatch();
  const [selectedItem, setSelectedItem] = useState(null);
  const [delay, setDelay] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');

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
        relativePath: getRelativePath(collection.pathname, info.pathname)
      };
      if (newItem.status !== 'error' && newItem.status !== 'skipped') {
        if (newItem.testResults) {
          const failed = newItem.testResults.filter((result) => result.status === 'fail');
          newItem.testStatus = failed.length ? 'fail' : 'pass';
        } else {
          newItem.testStatus = 'pass';
        }

        if (newItem.assertionResults) {
          const failed = newItem.assertionResults.filter((result) => result.status === 'fail');
          newItem.assertionStatus = failed.length ? 'fail' : 'pass';
        } else {
          newItem.assertionStatus = 'pass';
        }
      }
      return newItem;
    })
    .filter(Boolean);

  const runCollection = () => {
    dispatch(runCollectionFolder(collection.uid, null, true, Number(delay)));
  };

  const runAgain = () => {
    dispatch(runCollectionFolder(collection.uid, runnerInfo.folderUid, runnerInfo.isRecursive, Number(delay)));
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
  const passedRequests = items.filter((item) => 
    item.status !== 'error' && item.testStatus === 'pass' && item.assertionStatus === 'pass'
  );
  const failedRequests = items.filter((item) => 
    (item.status !== 'error' && item.testStatus === 'fail') || item.assertionStatus === 'fail'
  );
  const skippedRequests = items.filter((item) => item.status === 'skipped');
  const errorRequests = items.filter((item) => item.status === 'error');

  let isCollectionLoading = areItemsLoading(collection);

  const getFilteredItems = () => {
    switch(selectedFilter) {
      case 'passed':
        return items.filter(item => 
          item.status !== 'error' && item.testStatus === 'pass' && item.assertionStatus === 'pass'
        );
      case 'failed':
        return items.filter(item => 
          (item.status !== 'error' && item.testStatus === 'fail') || item.assertionStatus === 'fail'
        );
      case 'skipped':
        return items.filter(item => item.status === 'skipped');
      case 'error':
        return items.filter(item => item.status === 'error');
      default:
        return items;
    }
  };

  const openRequest = (item, e) => {    
    try {
      dispatch(
        addTab({
          uid: item.uid,
          collectionUid: collection.uid,
          pathname: item.pathname,
          type: item.type
        })
      );
      
    } catch (error) {
      console.error('Error opening request', error);
      toast.error('Failed to open the request');
    }
  };

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

        <div className='flex gap-1.5'>
          <button type="submit" className="submit btn btn-sm btn-secondary mt-6" onClick={runCollection}>
            Run Collection
          </button>

          <button className="submit btn btn-sm btn-close mt-6 ml-3" onClick={resetRunner}>
            Reset
          </button>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="px-4 pb-4 flex flex-grow flex-col relative">
      <div className="flex flex-row justify-between items-center">
        <div className="font-medium py-3 title flex items-center">
          Runner Results
          <IconRun size={18} strokeWidth={1.5} className="ml-2" />
        </div>
        {runnerInfo.status !== 'ended' && runnerInfo.cancelTokenUid && (
          <button className="cancel-execution-btn" onClick={cancelExecution}>
            <IconCircleX size={14} strokeWidth={1.5} />
            Cancel Execution
          </button>
        )}
      </div>

      <div className="runner-results-layout">
        <div className="requests-column">
          <div className="sticky-header">
            <div className="runner-stats">
              <div 
                className={`stat-item ${selectedFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('all')}
              >
                <IconFilter size={14} strokeWidth={1.5} />
                <span className="stat-label">All</span>
                <span className="stat-value">{items.length}</span>
              </div>
              <div 
                className={`stat-item success ${selectedFilter === 'passed' ? 'active success' : ''}`}
                onClick={() => setSelectedFilter('passed')}
              >
                <IconCircleCheck size={14} strokeWidth={2} />
                <span className="stat-value">{passedRequests.length}</span>
              </div>
              <div 
                className={`stat-item error ${selectedFilter === 'failed' ? 'active error' : ''}`}
                onClick={() => setSelectedFilter('failed')}
              >
                <IconCircleX size={14} strokeWidth={2} />
                <span className="stat-value">{failedRequests.length}</span>
              </div>
              <div 
                className={`stat-item warning ${selectedFilter === 'skipped' ? 'active warning' : ''}`}
                onClick={() => setSelectedFilter('skipped')}
              >
                <IconPlayerSkipForward size={14} strokeWidth={2} />
                <span className="stat-value">{skippedRequests.length}</span>
              </div>
              <div 
                className={`stat-item error ${selectedFilter === 'error' ? 'active error' : ''}`}
                onClick={() => setSelectedFilter('error')}
              >
                <IconCircleX size={14} strokeWidth={2} />
                <span className="stat-value">{errorRequests.length}</span>
              </div>
            </div>

            {runnerInfo?.statusText ? (
              <div className="status-message danger mt-2">
                {runnerInfo?.statusText}
              </div>
            ) : null}
          </div>

          <div 
            className="requests-container"
            ref={runnerBodyRef}
          >
            <div className="requests-list">
              {getFilteredItems().map((item) => (
                <div key={item.uid} className={`request-item ${selectedItem?.uid === item.uid ? 'expanded' : ''}`}>
                  <div 
                    className="request-header"
                    onClick={() => setSelectedItem(selectedItem?.uid === item.uid ? null : item)}
                  >
                    <div className="flex items-center gap-2">
                      {item.status !== 'error' && item.testStatus === 'pass' && item.status !== 'skipped' ? (
                        <IconCircleCheck className="test-success" size={16} strokeWidth={2} />
                      ) : item.status === 'skipped' ? (
                        <IconPlayerSkipForward className="test-warning" size={16} strokeWidth={2} />
                      ) : (
                        <IconCircleX className="test-failure" size={16} strokeWidth={2} />
                      )}
                      <span 
                        className={`request-path clickable ${item.status === 'error' || item.status === 'skipped' || item.testStatus === 'fail' ? 'danger' : ''}`}
                        onClick={(e) => openRequest(item, e)}
                        title="Open request"
                      >
                        {item.relativePath}
                        <IconExternalLink size={12} strokeWidth={1.5} className="ml-1 opacity-70" />
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status !== 'error' && item.status !== 'skipped' && item.status !== 'completed' ? (
                        <IconRefresh className="animate-spin" size={16} strokeWidth={1.5} />
                      ) : (
                        <div className="flex items-center">
                          {item.responseReceived?.status ? (
                            <span className="response-status">
                              {item.responseReceived?.status} - {item.responseReceived?.statusText}
                            </span>
                          ) : (
                            <span className="response-error">
                              Request Failed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.status === 'error' && item.error && (
                    <div className="error-message">{item.error}</div>
                  )}

                  {/* Test Results */}
                  {(item.testResults?.length > 0 || item.assertionResults?.length > 0) && (
                    <div className="test-results">
                      {item.testResults?.map((result) => (
                        <div key={result.uid} className={`test-result ${result.status}`}>
                          {result.status === 'pass' ? (
                            <IconCheck size={14} strokeWidth={2} />
                          ) : (
                            <IconX size={14} strokeWidth={2} />
                          )}
                          <span>{result.description}</span>
                          {result.error && <div className="result-error">{result.error}</div>}
                        </div>
                      ))}
                      
                      {item.assertionResults?.map((result) => (
                        <div key={result.uid} className={`test-result ${result.status}`}>
                          {result.status === 'pass' ? (
                            <IconCheck size={14} strokeWidth={2} />
                          ) : (
                            <IconX size={14} strokeWidth={2} />
                          )}
                          <span>{result.lhsExpr}: {result.rhsExpr}</span>
                          {result.error && <div className="result-error">{result.error}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {runnerInfo.status === 'ended' && (
              <div className="action-buttons">
                <button className="btn btn-sm btn-secondary flex items-center gap-2" onClick={runAgain}>
                  <IconRefresh size={16} strokeWidth={1.5} />
                  Run Again
                </button>
                <button className="btn btn-sm btn-secondary flex items-center gap-2" onClick={runCollection}>
                  <IconRun size={16} strokeWidth={1.5} />
                  Run Collection
                </button>
                <button className="btn btn-sm btn-close" onClick={resetRunner}>
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        {selectedItem && (
          <div className="response-pane-wrapper">
            <div className="response-pane-header">
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedItem.relativePath}</span>
                {selectedItem.testStatus === 'pass' ? (
                  <IconCircleCheck className="test-success" size={16} strokeWidth={1.5} />
                ) : (
                  <IconCircleX className="test-failure" size={16} strokeWidth={1.5} />
                )}
              </div>
              <button 
                className="close-btn" 
                onClick={() => setSelectedItem(null)}
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="response-pane-content">
              <ResponsePane item={selectedItem} collection={collection} />
            </div>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
}
