import React, { useMemo } from 'react';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import { computeLineDiffForOld, computeLineDiffForNew } from './utils/diffUtils';
import { getBodyContent } from './utils/bruUtils';

const VisualDiffExamples = ({ oldData, newData, showSide }) => {
  const oldExamples = get(oldData, 'examples', []) || [];
  const newExamples = get(newData, 'examples', []) || [];

  const currentExamples = showSide === 'old' ? oldExamples : newExamples;
  const otherExamples = showSide === 'old' ? newExamples : oldExamples;

  const otherExampleMap = useMemo(() => {
    const map = new Map();
    otherExamples.forEach((ex, index) => {
      const key = ex.name || `example-${index}`;
      map.set(key, ex);
    });
    return map;
  }, [otherExamples]);

  const examplesWithStatus = useMemo(() => {
    return currentExamples.map((example, index) => {
      const key = example.name || `example-${index}`;
      const otherExample = otherExampleMap.get(key);

      let status = 'unchanged';
      if (!otherExample) {
        status = showSide === 'old' ? 'deleted' : 'added';
      } else if (!isEqual(example, otherExample)) {
        status = 'modified';
      }

      return { ...example, _key: key, _status: status, _otherExample: otherExample };
    });
  }, [currentExamples, otherExampleMap, showSide]);

  const renderLineDiff = (segments) => {
    return segments.map((segment, index) => (
      <div key={index} className={`diff-line ${segment.status}`}>
        {segment.text || '\u00A0'}
      </div>
    ));
  };

  const renderKeyValueTable = (currentItems, otherItems, title) => {
    if (!currentItems || currentItems.length === 0) return null;

    const otherMap = new Map();
    (otherItems || []).forEach((item) => {
      otherMap.set(item.name, item);
    });

    const itemsWithStatus = currentItems.map((item) => {
      const otherItem = otherMap.get(item.name);
      let itemStatus = 'unchanged';
      if (!otherItem) {
        itemStatus = showSide === 'old' ? 'deleted' : 'added';
      } else if (item.value !== otherItem.value || item.enabled !== otherItem.enabled) {
        itemStatus = 'modified';
      }
      return { ...item, status: itemStatus };
    });

    return (
      <div className="example-subsection">
        <div className="example-subsection-title">{title}</div>
        <table className="diff-table">
          <thead>
            <tr>
              <th style={{ width: '30px' }}></th>
              <th className="checkbox-cell"></th>
              <th style={{ width: '40%' }}>Key</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {itemsWithStatus.map((item, idx) => (
              <tr key={idx} className={item.status}>
                <td>
                  {item.status !== 'unchanged' && (
                    <span className={`status-badge ${item.status}`}>
                      {item.status === 'added' ? 'A' : item.status === 'deleted' ? 'D' : 'M'}
                    </span>
                  )}
                </td>
                <td className="checkbox-cell">
                  <input type="checkbox" checked={item.enabled !== false} readOnly disabled />
                </td>
                <td className="key-cell">{item.name}</td>
                <td className="value-cell">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBodyContent = (currentBody, otherBody, title) => {
    if (!currentBody) return null;

    const currentContent = getBodyContent(currentBody);
    const otherContent = getBodyContent(otherBody);

    if (!currentContent) return null;

    const bodyDiff = showSide === 'old'
      ? computeLineDiffForOld(currentContent, otherContent)
      : computeLineDiffForNew(otherContent, currentContent);

    const bodyType = currentBody.mode || currentBody.type || 'text';

    return (
      <div className="example-subsection">
        <div className="example-subsection-title">{title} ({bodyType})</div>
        <div className="code-diff-content">{renderLineDiff(bodyDiff)}</div>
      </div>
    );
  };

  const renderExample = (example) => {
    const { request, response, _otherExample } = example;
    const otherRequest = _otherExample?.request;
    const otherResponse = _otherExample?.response;

    return (
      <div className="example-content">
        {request && (
          <div className="example-block">
            <div className="example-block-header">Request</div>

            {(request.method || request.url) && (
              <div className="example-subsection">
                <div className="url-bar">
                  {request.method && (
                    <span
                      className={`method ${request.method !== otherRequest?.method ? 'changed' : ''}`}
                    >
                      {request.method.toUpperCase()}
                    </span>
                  )}
                  {request.url && (
                    <span className={`url ${request.url !== otherRequest?.url ? 'changed' : ''}`}>
                      {request.url}
                    </span>
                  )}
                </div>
              </div>
            )}

            {renderKeyValueTable(
              request.params?.filter((p) => p.type === 'query'),
              otherRequest?.params?.filter((p) => p.type === 'query'),
              'Query Parameters'
            )}
            {renderKeyValueTable(
              request.params?.filter((p) => p.type === 'path'),
              otherRequest?.params?.filter((p) => p.type === 'path'),
              'Path Parameters'
            )}

            {renderKeyValueTable(request.headers, otherRequest?.headers, 'Headers')}

            {renderBodyContent(request.body, otherRequest?.body, 'Body')}
          </div>
        )}

        {response && (
          <div className="example-block">
            <div className="example-block-header">Response</div>

            {(response.status || response.statusText) && (
              <div className="example-subsection">
                <div className="example-subsection-title">Status</div>
                <div className="status-display">
                  <span
                    className={`status-code ${response.status !== otherResponse?.status ? 'changed' : ''}`}
                  >
                    {response.status || 200}
                  </span>
                  <span
                    className={`status-text ${response.statusText !== otherResponse?.statusText ? 'changed' : ''}`}
                  >
                    {response.statusText || 'OK'}
                  </span>
                </div>
              </div>
            )}

            {renderKeyValueTable(response.headers, otherResponse?.headers, 'Headers')}

            {renderBodyContent(response.body, otherResponse?.body, 'Body')}
          </div>
        )}
      </div>
    );
  };

  if (examplesWithStatus.length === 0) {
    return null;
  }

  return (
    <>
      {examplesWithStatus.map((example, index) => (
        <div key={example._key} className={`diff-section ${example._status}`}>
          <div className="diff-section-header">
            <span>
              {example.name || `Example ${index + 1}`}
              {example.description && (
                <span className="example-description"> - {example.description}</span>
              )}
            </span>
            {example._status !== 'unchanged' && (
              <span className={`status-badge ${example._status}`}>
                {example._status === 'added' ? 'A' : example._status === 'deleted' ? 'D' : 'M'}
              </span>
            )}
          </div>
          {renderExample(example)}
        </div>
      ))}
    </>
  );
};

export default VisualDiffExamples;
