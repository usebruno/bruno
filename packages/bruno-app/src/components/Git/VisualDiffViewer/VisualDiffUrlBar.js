import React, { useMemo } from 'react';
import { computeWordDiffForOld, computeWordDiffForNew } from './utils/diffUtils';
import { getMethod, getUrl } from './utils/bruUtils';

const VisualDiffUrlBar = ({ oldData, newData, showSide }) => {
  const oldMethod = getMethod(oldData);
  const newMethod = getMethod(newData);
  const oldUrl = getUrl(oldData);
  const newUrl = getUrl(newData);

  const currentMethod = showSide === 'old' ? oldMethod : newMethod;

  const urlDiffSegments = useMemo(() => {
    if (showSide === 'old') {
      return computeWordDiffForOld(oldUrl, newUrl);
    } else {
      return computeWordDiffForNew(oldUrl, newUrl);
    }
  }, [oldUrl, newUrl, showSide]);

  const methodChanged = oldMethod !== newMethod;
  const methodStatus = useMemo(() => {
    if (!methodChanged) return 'unchanged';
    if (showSide === 'old') return 'deleted';
    return 'added';
  }, [methodChanged, showSide]);

  const renderDiffSegments = (segments) => {
    return segments.map((segment, index) => {
      if (segment.status === 'unchanged') {
        return <span key={index}>{segment.text}</span>;
      }
      return (
        <span key={index} className={`diff-inline ${segment.status}`}>
          {segment.text}
        </span>
      );
    });
  };

  return (
    <div className="diff-section">
      <div className="url-bar">
        <span className={`method ${methodStatus !== 'unchanged' ? `diff-inline ${methodStatus}` : ''}`}>
          {currentMethod?.toUpperCase() || 'GET'}
        </span>
        <span className="url">
          {renderDiffSegments(urlDiffSegments)}
        </span>
      </div>
    </div>
  );
};

export default VisualDiffUrlBar;
