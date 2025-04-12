import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import classnames from 'classnames';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';
import get from 'lodash/get';
import { getCodeMirrorModeBasedOnContentType } from 'utils/common/codemirror';
import { safeStringifyJSON } from 'utils/common';

const ResponseCompare = ({ item, collection }) => {
  const [compareWith, setCompareWith] = useState(null);
  const [diffView, setDiffView] = useState('split'); // 'split' or 'unified'
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.preferences);
  
  // Get request timeline to show previous responses
  const requestTimeline = ([...(collection.timeline || [])]).filter(obj => obj.itemUid === item.uid);
  
  const currentResponse = item.response?.data;
  const previousResponse = compareWith?.data?.response?.data;

  // Get the mode based on content type
  const contentType = item.response?.headers?.['content-type'] || 'application/json';
  const mode = getCodeMirrorModeBasedOnContentType(contentType, currentResponse);

  // Format the response data
  const formatResponseData = (data) => {
    if (!data) return '';
    return safeStringifyJSON(data, true);
  };

  const formattedCurrentResponse = formatResponseData(currentResponse);
  const formattedPreviousResponse = formatResponseData(previousResponse);

  return (
    <StyledWrapper className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <select 
          className="response-select"
          onChange={(e) => {
            const selected = e.target.value ? JSON.parse(e.target.value) : null;
            setCompareWith(selected);
          }}
          value={compareWith ? JSON.stringify(compareWith) : ''}
        >
          <option value="">Select a previous response...</option>
          {requestTimeline.map((req, index) => (
            <option key={req.timestamp} value={JSON.stringify(req)}>
              Response #{requestTimeline.length - index} - {new Date(req.timestamp).toLocaleString()}
            </option>
          ))}
        </select>
        
        <div className="toggle-group">
          <button
            className={classnames({
              'active': diffView === 'split'
            })}
            onClick={() => setDiffView('split')}
          >
            Split View
          </button>
          <button
            className={classnames({
              'active': diffView === 'unified'
            })}
            onClick={() => setDiffView('unified')}
          >
            Unified View
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <div className={classnames('h-full', {
          'grid grid-cols-2 gap-1': diffView === 'split',
          'flex': diffView === 'unified'
        })}>
          {diffView === 'split' ? (
            <>
              <div className="h-full flex flex-col">
                <div className="font-medium mb-2">Current Response</div>
                <div className="flex-1 relative">
                  <CodeEditor
                    value={formattedCurrentResponse}
                    mode={mode}
                    readOnly={true}
                    theme={displayedTheme}
                    font={get(preferences, 'font.codeFont', 'default')}
                    fontSize={get(preferences, 'font.codeFontSize')}
                    collection={collection}
                  />
                </div>
              </div>
              <div className="h-full flex flex-col">
                <div className="font-medium mb-2">Previous Response</div>
                <div className="flex-1 relative">
                  <CodeEditor
                    value={formattedPreviousResponse}
                    mode={mode}
                    readOnly={true}
                    theme={displayedTheme}
                    font={get(preferences, 'font.codeFont', 'default')}
                    fontSize={get(preferences, 'font.codeFontSize')}
                    collection={collection}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="h-full w-full flex flex-col">
              <div className="font-medium mb-2">Unified Diff</div>
              <div className="flex-1 relative">
                <CodeEditor
                  value={generateUnifiedDiff(currentResponse, previousResponse)}
                  mode={mode}
                  readOnly={true}
                  theme={displayedTheme}
                  font={get(preferences, 'font.codeFont', 'default')}
                  fontSize={get(preferences, 'font.codeFontSize')}
                  collection={collection}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

// Helper function to generate unified diff
const generateUnifiedDiff = (current, previous) => {
  if (!current || !previous) return '';
  
  // Simple diff implementation - can be enhanced with proper diff algorithm
  const currentStr = JSON.stringify(current, null, 2);
  const previousStr = JSON.stringify(previous, null, 2);
  
  return `--- Previous\n+++ Current\n${currentStr !== previousStr ? `+${currentStr}\n-${previousStr}` : ' No changes'}`;
};

export default ResponseCompare; 