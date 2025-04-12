import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import classnames from 'classnames';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';

const ResponseCompare = ({ item, collection }) => {
  const [compareWith, setCompareWith] = useState(null);
  const [diffView, setDiffView] = useState('split'); // 'split' or 'unified'
  
  // Get request timeline to show previous responses
  const requestTimeline = ([...(collection.timeline || [])]).filter(obj => obj.itemUid === item.uid);
  
  const currentResponse = item.response?.data;
  const previousResponse = compareWith?.data?.response?.data;

  return (
    <StyledWrapper className="flex flex-col h-full">
      <div className="flex items-center mb-4">
        <select 
          className="px-3 py-1 border rounded mr-4"
          onChange={(e) => {
            const selected = e.target.value ? JSON.parse(e.target.value) : null;
            console.log('Selected response:', selected); // Debug log
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
        
        <div className="flex items-center">
          <label className="mr-2">View:</label>
          <button
            className={classnames('px-3 py-1 rounded mr-2', {
              'bg-blue-500 text-white': diffView === 'split',
              'border': diffView !== 'split'
            })}
            onClick={() => setDiffView('split')}
          >
            Split
          </button>
          <button
            className={classnames('px-3 py-1 rounded', {
              'bg-blue-500 text-white': diffView === 'unified',
              'border': diffView !== 'unified'
            })}
            onClick={() => setDiffView('unified')}
          >
            Unified
          </button>
        </div>
      </div>

      <div className={classnames('flex flex-1', {
        'flex-row': diffView === 'split',
        'flex-col': diffView === 'unified'
      })}>
        {diffView === 'split' ? (
          <>
            <div className="flex-1 mr-2">
              <div className="font-medium mb-2">Current Response</div>
              <CodeEditor
                value={currentResponse ? JSON.stringify(currentResponse, null, 2) : ''}
                mode="json"
                readOnly={true}
              />
            </div>
            <div className="flex-1 ml-2">
              <div className="font-medium mb-2">Previous Response</div>
              <CodeEditor
                value={previousResponse ? JSON.stringify(previousResponse, null, 2) : ''}
                mode="json"
                readOnly={true}
              />
            </div>
          </>
        ) : (
          <div className="flex-1">
            <CodeEditor
              value={generateUnifiedDiff(currentResponse, previousResponse)}
              mode="diff"
              readOnly={true}
            />
          </div>
        )}
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