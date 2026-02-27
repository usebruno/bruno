import React, { useMemo } from 'react';
import get from 'lodash/get';
import { computeLineDiffForOld, computeLineDiffForNew } from './utils/diffUtils';

const VisualDiffScript = ({ oldData, newData, showSide }) => {
  const oldScript = get(oldData, 'request.script', {});
  const newScript = get(newData, 'request.script', {});

  const currentScript = showSide === 'old' ? oldScript : newScript;
  const otherScript = showSide === 'old' ? newScript : oldScript;

  const currentPreReq = currentScript?.req || '';
  const otherPreReq = otherScript?.req || '';

  const currentPostRes = currentScript?.res || '';
  const otherPostRes = otherScript?.res || '';

  const currentTests = get(showSide === 'old' ? oldData : newData, 'request.tests', '');
  const otherTests = get(showSide === 'old' ? newData : oldData, 'request.tests', '');

  const preReqDiff = useMemo(() => {
    if (showSide === 'old') {
      return computeLineDiffForOld(currentPreReq, otherPreReq);
    } else {
      return computeLineDiffForNew(otherPreReq, currentPreReq);
    }
  }, [currentPreReq, otherPreReq, showSide]);

  const postResDiff = useMemo(() => {
    if (showSide === 'old') {
      return computeLineDiffForOld(currentPostRes, otherPostRes);
    } else {
      return computeLineDiffForNew(otherPostRes, currentPostRes);
    }
  }, [currentPostRes, otherPostRes, showSide]);

  const testsDiff = useMemo(() => {
    if (showSide === 'old') {
      return computeLineDiffForOld(currentTests, otherTests);
    } else {
      return computeLineDiffForNew(otherTests, currentTests);
    }
  }, [currentTests, otherTests, showSide]);

  const renderLineDiff = (segments) => {
    return segments.map((segment, index) => (
      <div key={index} className={`diff-line ${segment.status}`}>
        {segment.text || '\u00A0'}
      </div>
    ));
  };

  const renderScriptSection = (content, diffSegments, title) => {
    if (!content) return null;

    return (
      <div className="diff-section">
        <div className="diff-section-header">{title}</div>
        <div className="code-diff-content">
          {renderLineDiff(diffSegments)}
        </div>
      </div>
    );
  };

  const hasContent = currentPreReq || currentPostRes || currentTests;

  if (!hasContent) {
    return null;
  }

  return (
    <>
      {renderScriptSection(currentPreReq, preReqDiff, 'Pre-Request Script')}
      {renderScriptSection(currentPostRes, postResDiff, 'Post-Response Script')}
      {renderScriptSection(currentTests, testsDiff, 'Tests')}
    </>
  );
};

export default VisualDiffScript;
