import React, { useMemo } from 'react';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import { computeLineDiffForOld, computeLineDiffForNew } from './utils/diffUtils';

const BODY_TYPE_LABELS = {
  json: 'JSON',
  text: 'Text',
  xml: 'XML',
  sparql: 'SPARQL',
  graphql: 'GraphQL',
  formUrlEncoded: 'Form URL Encoded',
  multipartForm: 'Multipart Form',
  file: 'File',
  grpc: 'gRPC',
  ws: 'WebSocket'
};

const TEXT_BODY_TYPES = ['json', 'text', 'xml', 'sparql'];
const FORM_BODY_TYPES = ['formUrlEncoded', 'multipartForm'];
const ALL_BODY_TYPES = Object.keys(BODY_TYPE_LABELS);

const VisualDiffBody = ({ oldData, newData, showSide }) => {
  const oldBody = get(oldData, 'request.body', {});
  const newBody = get(newData, 'request.body', {});

  const currentBody = showSide === 'old' ? oldBody : newBody;
  const otherBody = showSide === 'old' ? newBody : oldBody;

  const bodyTypes = useMemo(() => {
    const currentMode = currentBody.mode;
    const otherMode = otherBody.mode;

    // Collect body types that match either side's active mode
    const relevantTypes = new Set();
    if (currentMode && currentMode !== 'none') {
      relevantTypes.add(currentMode);
    }
    if (otherMode && otherMode !== 'none') {
      relevantTypes.add(otherMode);
    }

    // If neither side has a mode (legacy data), fall back to showing all defined types
    if (relevantTypes.size === 0) {
      return ALL_BODY_TYPES.filter((type) => {
        const currentVal = currentBody[type];
        const otherVal = otherBody[type];
        return currentVal !== undefined || otherVal !== undefined;
      });
    }

    // Only show body types that match the active mode on either side
    return ALL_BODY_TYPES.filter((type) => {
      if (!relevantTypes.has(type)) return false;
      const currentVal = currentBody[type];
      const otherVal = otherBody[type];
      return currentVal !== undefined || otherVal !== undefined;
    });
  }, [currentBody, otherBody]);

  const renderLineDiff = (segments) => {
    return segments.map((segment, index) => (
      <div key={index} className={`diff-line ${segment.status}`}>
        {segment.text || '\u00A0'}
      </div>
    ));
  };

  const renderFormData = (items, otherItems) => {
    if (!items || items.length === 0) return null;

    const otherItemMap = new Map();
    (otherItems || []).forEach((item) => {
      otherItemMap.set(item.name, item);
    });

    return (
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
          {items.map((item, index) => {
            const otherItem = otherItemMap.get(item.name);
            let status = 'unchanged';
            if (!otherItem) {
              status = showSide === 'old' ? 'deleted' : 'added';
            } else if (item.value !== otherItem.value || item.enabled !== otherItem.enabled) {
              status = 'modified';
            }

            return (
              <tr key={`${item.name}-${index}`} className={status}>
                <td>
                  {status !== 'unchanged' && (
                    <span className={`status-badge ${status}`}>
                      {status === 'added' ? 'A' : status === 'deleted' ? 'D' : 'M'}
                    </span>
                  )}
                </td>
                <td className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={item.enabled !== false}
                    readOnly
                    disabled
                  />
                </td>
                <td className="key-cell">{item.name}</td>
                <td className="value-cell">{item.value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderFileBody = (files, otherFiles) => {
    if (!files || files.length === 0) return null;

    const otherFileMap = new Map();
    (otherFiles || []).forEach((f, idx) => {
      otherFileMap.set(f.filePath || idx, f);
    });

    return (
      <table className="diff-table">
        <thead>
          <tr>
            <th style={{ width: '30px' }}></th>
            <th className="checkbox-cell"></th>
            <th>File Path</th>
            <th style={{ width: '100px' }}>Content Type</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file, index) => {
            const otherFile = otherFileMap.get(file.filePath || index);
            let status = 'unchanged';
            if (!otherFile) {
              status = showSide === 'old' ? 'deleted' : 'added';
            } else if (file.filePath !== otherFile.filePath || file.contentType !== otherFile.contentType) {
              status = 'modified';
            }

            return (
              <tr key={index} className={status}>
                <td>
                  {status !== 'unchanged' && (
                    <span className={`status-badge ${status}`}>
                      {status === 'added' ? 'A' : status === 'deleted' ? 'D' : 'M'}
                    </span>
                  )}
                </td>
                <td className="checkbox-cell">
                  <input type="checkbox" checked={file.selected !== false} readOnly disabled />
                </td>
                <td className="value-cell">{file.filePath}</td>
                <td className="value-cell">{file.contentType || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderMessageBody = (messages, otherMessages, typeLabel) => {
    if (!messages || messages.length === 0) return null;

    return messages.map((msg, index) => {
      const otherMsg = (otherMessages || [])[index];
      const contentDiff = showSide === 'old'
        ? computeLineDiffForOld(msg.content || '', otherMsg?.content || '')
        : computeLineDiffForNew(otherMsg?.content || '', msg.content || '');

      let msgStatus = 'unchanged';
      if (!otherMsg) {
        msgStatus = showSide === 'old' ? 'deleted' : 'added';
      } else if (msg.name !== otherMsg.name || msg.type !== otherMsg.type) {
        msgStatus = 'modified';
      }

      return (
        <div key={index}>
          <div className="diff-section-header">
            <span>{typeLabel}: {msg.name || `Message ${index + 1}`}{msg.type ? ` (${msg.type})` : ''}</span>
            {msgStatus !== 'unchanged' && (
              <span className={`status-badge ${msgStatus}`}>
                {msgStatus === 'added' ? 'A' : msgStatus === 'deleted' ? 'D' : 'M'}
              </span>
            )}
          </div>
          <div className="code-diff-content">{renderLineDiff(contentDiff)}</div>
        </div>
      );
    });
  };

  const renderGraphqlBody = (graphql, otherGraphql) => {
    const currentQuery = graphql?.query || '';
    const otherQuery = otherGraphql?.query || '';
    const currentVariables = graphql?.variables || '';
    const otherVariables = otherGraphql?.variables || '';

    const queryDiff = showSide === 'old'
      ? computeLineDiffForOld(currentQuery, otherQuery)
      : computeLineDiffForNew(otherQuery, currentQuery);

    const variablesDiff = showSide === 'old'
      ? computeLineDiffForOld(currentVariables, otherVariables)
      : computeLineDiffForNew(otherVariables, currentVariables);

    return (
      <>
        {(currentQuery || otherQuery) && (
          <div>
            <div className="diff-section-header">Query</div>
            <div className="code-diff-content">{renderLineDiff(queryDiff)}</div>
          </div>
        )}
        {(currentVariables || otherVariables) && (
          <div>
            <div className="diff-section-header">Variables</div>
            <div className="code-diff-content">{renderLineDiff(variablesDiff)}</div>
          </div>
        )}
      </>
    );
  };

  const renderTextBody = (currentContent, otherContent) => {
    const diffSegments = showSide === 'old'
      ? computeLineDiffForOld(currentContent || '', otherContent || '')
      : computeLineDiffForNew(otherContent || '', currentContent || '');

    return (
      <div className="code-diff-content">
        {renderLineDiff(diffSegments)}
      </div>
    );
  };

  const renderBodyType = (type) => {
    const currentVal = currentBody[type];
    const otherVal = otherBody[type];

    if (currentVal === undefined && otherVal === undefined) return null;

    // For text-based body types
    if (TEXT_BODY_TYPES.includes(type)) {
      if (!currentVal) return null;
      return renderTextBody(currentVal, otherVal);
    }

    // For form data types
    if (FORM_BODY_TYPES.includes(type)) {
      return renderFormData(currentVal, otherVal);
    }

    // GraphQL
    if (type === 'graphql') {
      return renderGraphqlBody(currentVal, otherVal);
    }

    // File
    if (type === 'file') {
      return renderFileBody(currentVal, otherVal);
    }

    // gRPC
    if (type === 'grpc') {
      return renderMessageBody(currentVal, otherVal, 'gRPC');
    }

    // WebSocket
    if (type === 'ws') {
      return renderMessageBody(currentVal, otherVal, 'WebSocket');
    }

    return null;
  };

  // Show body mode if present
  const currentMode = currentBody.mode;
  const otherMode = otherBody.mode;
  const modeStatus = currentMode !== otherMode ? (otherMode === undefined ? (showSide === 'old' ? 'deleted' : 'added') : 'modified') : 'unchanged';

  if (bodyTypes.length === 0 && !currentMode) {
    return null;
  }

  return (
    <>
      {currentMode && (
        <div className="diff-section">
          <table className="diff-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}></th>
                <th style={{ width: '40%' }}>Field</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className={modeStatus}>
                <td>
                  {modeStatus !== 'unchanged' && (
                    <span className={`status-badge ${modeStatus}`}>
                      {modeStatus === 'added' ? 'A' : modeStatus === 'deleted' ? 'D' : 'M'}
                    </span>
                  )}
                </td>
                <td className="key-cell">Body Mode</td>
                <td className="value-cell">{BODY_TYPE_LABELS[currentMode] || currentMode}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {bodyTypes.map((type) => {
        const content = renderBodyType(type);
        if (!content) return null;

        const currentVal = currentBody[type];
        const otherVal = otherBody[type];
        const hasChanges = !isEqual(currentVal, otherVal);

        return (
          <div key={type} className="diff-section">
            <div className="diff-section-header">
              <span>{BODY_TYPE_LABELS[type] || type}</span>
              {hasChanges && (
                <span className={`status-badge ${otherVal === undefined ? (showSide === 'old' ? 'deleted' : 'added') : 'modified'}`}>
                  {otherVal === undefined ? (showSide === 'old' ? 'D' : 'A') : 'M'}
                </span>
              )}
            </div>
            {content}
          </div>
        );
      })}
    </>
  );
};

export default VisualDiffBody;
