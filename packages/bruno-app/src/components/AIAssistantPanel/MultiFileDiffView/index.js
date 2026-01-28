import React, { useState } from 'react';
import { IconCheck, IconX, IconCode } from '@tabler/icons';
import DiffView from '../DiffView';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const MultiFileDiffView = ({ changes, onAccept, onReject, onAcceptAll, onRejectAll, onComplete }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const pendingChanges = changes.filter((c) => c.status === 'pending');
  const acceptedCount = changes.filter((c) => c.status === 'accepted').length;
  const rejectedCount = changes.filter((c) => c.status === 'rejected').length;

  const activeChange = changes[activeIndex];
  const isActiveChangePending = activeChange?.status === 'pending';

  const getMethodClass = (method) => (method || 'get').toLowerCase();

  const handleAccept = () => {
    onAccept(activeIndex);
    // Move to next pending item if available
    const nextPendingIndex = changes.findIndex((c, i) => i > activeIndex && c.status === 'pending');
    if (nextPendingIndex !== -1) {
      setActiveIndex(nextPendingIndex);
    }
  };

  const handleReject = () => {
    onReject(activeIndex);
    // Move to next pending item if available
    const nextPendingIndex = changes.findIndex((c, i) => i > activeIndex && c.status === 'pending');
    if (nextPendingIndex !== -1) {
      setActiveIndex(nextPendingIndex);
    }
  };

  // Show completion message if all changes are processed
  if (pendingChanges.length === 0) {
    return (
      <StyledWrapper>
        <div className="completed-message">
          <IconCheck size={32} className="icon" />
          <span className="text">All changes reviewed</span>
          <span className="details">
            {acceptedCount} accepted, {rejectedCount} rejected
          </span>
          {acceptedCount > 0 && (
            <Button
              variant="filled"
              color="success"
              size="sm"
              onClick={onComplete}
            >
              Apply {acceptedCount} change{acceptedCount > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      {/* File tabs */}
      <div className="file-tabs">
        {changes.map((change, index) => (
          <div
            key={`${change.itemUid}-${change.scriptType}`}
            className={`file-tab ${index === activeIndex ? 'active' : ''} ${change.status}`}
            onClick={() => setActiveIndex(index)}
          >
            <span className={`method-badge ${getMethodClass(change.method)}`}>
              {(change.method || 'GET').substring(0, 3)}
            </span>
            <span className="file-name" title={change.fileName}>
              {change.fileName}
            </span>
            <span className="script-type">
              {change.scriptType === 'pre-request' ? 'PRE' : 'POST'}
            </span>
            {change.status !== 'pending' && (
              <span className={`status-icon ${change.status}`}>
                {change.status === 'accepted' ? <IconCheck size={12} /> : <IconX size={12} />}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Active file header */}
      <div className="diff-header">
        <IconCode size={14} />
        <div className="file-info">
          <span className={`method ${getMethodClass(activeChange?.method)}`}>
            {activeChange?.method || 'GET'}
          </span>
          <span className="name">{activeChange?.fileName}</span>
          <span className="script-badge">{activeChange?.scriptType}</span>
        </div>
      </div>

      {/* Diff view */}
      <div className="diff-container">
        <DiffView
          original={activeChange?.original || ''}
          proposed={activeChange?.proposed || ''}
        />
      </div>

      {/* Actions */}
      <div className="actions">
        <div className="individual-actions">
          <div>
            <Button
              variant="outline"
              color="danger"
              size="sm"
              fullWidth
              onClick={handleReject}
              disabled={!isActiveChangePending}
            >
              Reject
            </Button>
          </div>
          <div>
            <Button
              variant="filled"
              color="success"
              size="sm"
              fullWidth
              onClick={handleAccept}
              disabled={!isActiveChangePending}
            >
              Accept
            </Button>
          </div>
        </div>

        {pendingChanges.length > 1 && (
          <div className="bulk-actions">
            <Button variant="ghost" color="secondary" size="xs" onClick={onRejectAll}>
              Reject All
            </Button>
            <Button variant="filled" color="primary" size="xs" onClick={onAcceptAll}>
              Accept All ({pendingChanges.length})
            </Button>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="progress">
        {changes.length - pendingChanges.length} of {changes.length} reviewed
      </div>
    </StyledWrapper>
  );
};

export default MultiFileDiffView;
