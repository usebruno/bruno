import React, { useMemo } from 'react';
import get from 'lodash/get';
import { computeLineDiffForOld, computeLineDiffForNew } from './utils/diffUtils';

const VisualDiffDocs = ({ oldData, newData, showSide }) => {
  const oldDocs = get(oldData, 'request.docs', '') || '';
  const newDocs = get(newData, 'request.docs', '') || '';

  const currentDocs = showSide === 'old' ? oldDocs : newDocs;
  const otherDocs = showSide === 'old' ? newDocs : oldDocs;

  const docsDiff = useMemo(() => {
    if (showSide === 'old') {
      return computeLineDiffForOld(currentDocs, otherDocs);
    } else {
      return computeLineDiffForNew(otherDocs, currentDocs);
    }
  }, [currentDocs, otherDocs, showSide]);

  if (!currentDocs) {
    return null;
  }

  const renderLineDiff = (segments) => {
    return segments.map((segment, index) => (
      <div key={index} className={`diff-line ${segment.status}`}>
        {segment.text || '\u00A0'}
      </div>
    ));
  };

  return (
    <div className="diff-section">
      <div className="code-diff-content">
        {renderLineDiff(docsDiff)}
      </div>
    </div>
  );
};

export default VisualDiffDocs;
