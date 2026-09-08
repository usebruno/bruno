import React from 'react';
import { formatSize } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const MODE_LABEL_OVERRIDES = {
  'gfm': 'markdown',
  'htmlmixed': 'html',
  'text/plain': 'plain text',
  'application/x-www-form-urlencoded': 'form'
};

const getModeLabel = (mode) => {
  if (!mode) return 'plain text';
  if (MODE_LABEL_OVERRIDES[mode]) return MODE_LABEL_OVERRIDES[mode];
  return mode.split('/').pop().split('+').pop();
};

const StatusBar = ({ value, mode, longLineDetected, longLineMode, onToggle }) => {
  const sizeText = formatSize(new TextEncoder().encode(value ?? '').length);
  const modeLabel = longLineMode ? 'plain text' : getModeLabel(mode);

  return (
    <StyledWrapper data-testid="editor-status-bar">
      <span className="status-left">
        {sizeText} · {modeLabel} mode{longLineMode ? ' · editor features turned off for performance' : ''}
      </span>
      {longLineDetected && (
        <button type="button" className="status-toggle" data-testid="editor-status-bar-toggle" onClick={onToggle}>
          {longLineMode ? 'enable full editor' : 'disable full editor'}
        </button>
      )}
    </StyledWrapper>
  );
};

export default StatusBar;
