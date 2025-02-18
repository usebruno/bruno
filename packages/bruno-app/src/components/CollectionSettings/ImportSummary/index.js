import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { readImportSummary } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { IconBox } from '@tabler/icons';
import Info from './Info';
import TreeView from './TreeView';
import DiffViewer from './DiffViewer';
import { get } from 'lodash';
import classnames from 'classnames';

const findPath = (obj, targetValue, path = '') => {
  if (!obj || typeof obj !== 'object') return null;

  for (let key in obj) {
    let newPath = path ? `${path}.${key}` : key;

    if (obj[key] === targetValue) {
      return newPath;
    }

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      let result = findPath(obj[key], targetValue, newPath);
      if (result) return result;
    }
  }
  return null;
};

const ImportSummary = ({ collection }) => {
  const dispatch = useDispatch();
  const [importSummaryData, setImportSummaryData] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('code');
  const [activeScriptTab, setActiveScriptTab] = useState('pre-request');
  const [dragging, setDragging] = useState(false);
  const [treeViewWidth, setTreeViewWidth] = useState(300);

  const handleMouseMove = useCallback((e) => {
    if (dragging) {
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setTreeViewWidth(newWidth);
      }
    }
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleDragbarMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  useEffect(() => {
    if (!collection.pathname) return;

    const loadImportSummary = async () => {
      try {
        const summaryData = await dispatch(readImportSummary(collection.pathname));
        setImportSummaryData(summaryData);
      } catch (err) {
        console.error('Failed to load import summary:', err);
      }
    };

    loadImportSummary();
  }, [collection.pathname, dispatch]);

  const getValueAtPath = (obj, path) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  };

  const handleRequestClick = (item) => {
    if (!importSummaryData?.brunoCollectionUntranslated) return;

    let contentUntranslated = null;
    let contentTranslated = null;
    let sourceType = 'request';

    // Handle different types of items
    if (item.type === 'folder') {
      sourceType = 'folder';
      // For folders, we need to look at the root property
      contentUntranslated = {
        root: {
          request: {
            script: item.root?.request?.script || {},
            tests: item.root?.request?.tests || ''
          }
        }
      };
      
      // Find the corresponding translated folder
      const translatedFolder = importSummaryData.brunoCollection.items.find(
        f => f.uid === item.uid
      );
      contentTranslated = {
        root: {
          request: {
            script: translatedFolder?.root?.request?.script || {},
            tests: translatedFolder?.root?.request?.tests || ''
          }
        }
      };
    } else {
      // For requests, use the request property directly
      contentUntranslated = {
        request: {
          script: item.request?.script || {},
          tests: item.request?.tests || ''
        }
      };

      // Find the corresponding translated request
      const translatedRequest = findRequestInCollection(
        importSummaryData.brunoCollection,
        item.uid
      );
      contentTranslated = {
        request: {
          script: translatedRequest?.request?.script || {},
          tests: translatedRequest?.request?.tests || ''
        }
      };
    }

    setSelectedRequest({
      requestContentUntranslated: contentUntranslated,
      requestContentTranslated: contentTranslated,
      sourceType
    });
  };

  // Helper function to find a request in the collection by uid
  const findRequestInCollection = (collection, uid) => {
    const findInItems = (items) => {
      for (const item of items || []) {
        if (item.uid === uid) return item;
        if (item.type === 'folder') {
          const found = findInItems(item.items);
          if (found) return found;
        }
      }
      return null;
    };
    return findInItems(collection.items);
  };

  const handleFolderClick = (folder) => {
    handleRequestClick(folder);
  };

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === activeTab
    });
  };

  const getScriptTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === activeScriptTab
    });
  };

  const getScriptContent = (request, type) => {
    if (!request) return null;
    
    switch (type) {
      case 'pre-request':
        return request?.request?.script?.req || '';
      case 'post-response':
        return request?.request?.script?.res || '';
      case 'test':
        return request?.request?.tests || '';
      default:
        return '';
    }
  };

  const formatCode = (code) => {
    if (typeof code === 'string') {
      return code;
    }
    try {
      return JSON.stringify(code, null, 2);
    } catch (e) {
      return 'Invalid code format';
    }
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'code': {
        return (
          <StyledWrapper className="flex-1 p-4">
            <div className="flex flex-wrap items-center script-tabs" role="tablist">
              <div className={getScriptTabClassname('pre-request')} role="tab" onClick={() => setActiveScriptTab('pre-request')}>
                Pre-request
              </div>
              <div className={getScriptTabClassname('post-response')} role="tab" onClick={() => setActiveScriptTab('post-response')}>
                Post-response
              </div>
              <div className={getScriptTabClassname('test')} role="tab" onClick={() => setActiveScriptTab('test')}>
                Test
              </div>
            </div>
            <pre>
              {selectedRequest 
                ? formatCode(getScriptContent(selectedRequest.requestContentUntranslated, activeScriptTab))
                : 'Select a request'}
            </pre>
          </StyledWrapper>
        );
      }
      case 'diff': {
        return selectedRequest && (
          <StyledWrapper>
            <div className="flex flex-wrap items-center script-tabs" role="tablist">
              <div className={getScriptTabClassname('pre-request')} role="tab" onClick={() => setActiveScriptTab('pre-request')}>
                Pre-request
              </div>
              <div className={getScriptTabClassname('post-response')} role="tab" onClick={() => setActiveScriptTab('post-response')}>
                Post-response
              </div>
              <div className={getScriptTabClassname('test')} role="tab" onClick={() => setActiveScriptTab('test')}>
                Test
              </div>
            </div>
            <DiffViewer
              className="h-full"
              untranslated={selectedRequest.requestContentUntranslated}
              translated={selectedRequest.requestContentTranslated}
              scriptType={activeScriptTab}
              sourceType={selectedRequest.sourceType}
            />
          </StyledWrapper>
        );
      }
    }
  };

  return (
    <StyledWrapper className={`h-full flex flex-col ${dragging ? 'dragging' : ''}`}>
      <div className="flex flex-1 min-h-0">
        <div 
          className="h-full overflow-hidden flex flex-col"
          style={{ 
            width: `${treeViewWidth}px`,
            minWidth: '200px',
            maxWidth: '600px'
          }}
        >
          <div className="flex-1 overflow-auto">
            {importSummaryData && (
              <TreeView 
                items={importSummaryData.brunoCollection?.items} 
                collection={importSummaryData.brunoCollection}
                onRequestClick={handleRequestClick}
                onFolderClick={handleFolderClick}
              />
            )}
          </div>
        </div>

        <div 
          className="dragbar"
          onMouseDown={handleDragbarMouseDown}
        >
          <div className="dragbar-inner" />
        </div>

        <div className="flex-1 pl-4 min-w-0 flex flex-col overflow-hidden">
          <div className="flex flex-wrap items-center tabs" role="tablist">
            <div className={getTabClassname('code')} role="tab" onClick={() => setActiveTab('code')}>
              Code
            </div>
            <div className={getTabClassname('diff')} role="tab" onClick={() => setActiveTab('diff')}>
              Diff
            </div>
          </div>
          <div className="flex-1 overflow-auto mt-4">
            {getTabPanel(activeTab)}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default ImportSummary;
