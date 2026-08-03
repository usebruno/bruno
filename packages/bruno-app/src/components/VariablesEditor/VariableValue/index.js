import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import get from 'lodash/get';
import { IconCheck, IconCopy, IconEye, IconEyeOff } from '@tabler/icons';
import { mockDataFunctions } from '@usebruno/common';
import { PROMPT_VARIABLE_TEXT_PATTERN, toDisplayString } from '@usebruno/common/utils';
import { getAllVariables } from 'utils/collections';
import { renderVarInfo } from 'utils/codemirror/brunoVarInfo';
import StyledWrapper from './StyledWrapper';

const VAR_REF_PATTERN = /(\{\{[^}]+\}\})/g;
const HOVER_DELAY_MS = 50;
const HIDE_DELAY_MS = 500;
const EDGE_MARGIN_REM = 0.5;
const GAP_REM = 0.3125;
const COPY_FEEDBACK_MS = 1200;

const isObjectOrArray = (value) => value !== null && typeof value === 'object';

export const getVarRefStatus = (tokenString, variables) => {
  const word = String(tokenString || '').replace(/^\{\{|\}\}$/g, '');
  if (!word) return 'invalid';
  if (PROMPT_VARIABLE_TEXT_PATTERN.test(word)) return 'prompt';

  const isMockVariable = word.startsWith('$') && Object.prototype.hasOwnProperty.call(mockDataFunctions, word.substring(1));
  if (isMockVariable) return 'valid';

  const { pathParams, ...rest } = variables || {};
  return get(rest, word) !== undefined ? 'valid' : 'invalid';
};

export const getCompactPreview = (value) => {
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (value !== null && typeof value === 'object') {
    const keyCount = Object.keys(value).length;
    return `{${keyCount} ${keyCount === 1 ? 'key' : 'keys'}}`;
  }
  return String(value);
};

const getCopyText = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return toDisplayString(value, '');
};

const hideActivePopup = (popupRef) => {
  const popup = popupRef.current;
  if (!popup) return;
  if (typeof popup._cleanup === 'function') {
    popup._cleanup();
  } else if (popup.parentNode) {
    popup.parentNode.removeChild(popup);
  }
  popupRef.current = null;
};

const showVarInfoPopup = ({ box, tokenString, options, popupRef, clearHoverTimers }) => {
  hideActivePopup(popupRef);
  clearHoverTimers?.();

  const content = renderVarInfo({ string: tokenString }, options);
  if (!content) return;

  const popup = document.createElement('div');
  popup.className = 'CodeMirror-brunoVarInfo';
  popup.setAttribute('data-testid', 'var-info-popup');
  popup.appendChild(content);
  document.body.appendChild(popup);
  popupRef.current = popup;

  const popupBox = popup.getBoundingClientRect();
  const popupStyle = window.getComputedStyle(popup);
  const popupWidth
    = popupBox.width + parseFloat(popupStyle.marginLeft) + parseFloat(popupStyle.marginRight);
  const popupHeight
    = popupBox.height + parseFloat(popupStyle.marginTop) + parseFloat(popupStyle.marginBottom);

  let topPos = box.bottom + GAP_REM * 16;
  if (popupHeight > window.innerHeight - box.bottom - EDGE_MARGIN_REM * 16 && box.top > window.innerHeight - box.bottom) {
    topPos = box.top - popupHeight - GAP_REM * 16;
  }
  if (topPos < EDGE_MARGIN_REM * 16) {
    topPos = EDGE_MARGIN_REM * 16;
  }

  let leftPos = box.left;
  if (leftPos + popupWidth > window.innerWidth - EDGE_MARGIN_REM * 16) {
    leftPos = window.innerWidth - popupWidth - EDGE_MARGIN_REM * 16;
  }
  if (leftPos < EDGE_MARGIN_REM * 16) {
    leftPos = EDGE_MARGIN_REM * 16;
  }

  popup.style.opacity = '1';
  popup.style.top = `${topPos / 16}rem`;
  popup.style.left = `${leftPos / 16}rem`;

  let hideTimeout;

  const scheduleHide = () => {
    if (popup.contains(document.activeElement)) return;
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => hideActivePopup(popupRef), HIDE_DELAY_MS);
  };

  const cancelHide = () => {
    clearTimeout(hideTimeout);
    clearHoverTimers?.();
  };

  const onDocumentClick = (e) => {
    if (!popup.contains(e.target)) {
      hideActivePopup(popupRef);
    }
  };

  const cleanup = () => {
    clearTimeout(hideTimeout);
    popup.removeEventListener('mouseenter', cancelHide);
    popup.removeEventListener('mouseleave', scheduleHide);
    document.removeEventListener('mousedown', onDocumentClick);
    if (popup.parentNode) {
      popup.parentNode.removeChild(popup);
    }
  };

  popup._cleanup = cleanup;
  popup.addEventListener('mouseenter', cancelHide);
  popup.addEventListener('mouseleave', scheduleHide);
  document.addEventListener('mousedown', onDocumentClick);
};

const VariableValue = ({
  value,
  secret,
  name,
  collection,
  isSelected,
  onOpenObject
}) => {
  const popupRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const leaveTimeoutRef = useRef(null);
  const copyResetTimeoutRef = useRef(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const variables = useMemo(() => getAllVariables(collection), [collection]);
  const isMasked = !!secret && !revealed;

  const displayValue = useMemo(() => {
    if (isMasked) {
      return '********';
    }
    return value;
  }, [value, isMasked]);

  /**
   * Clear hover timers when the mouse leaves the row.
   */
  const clearHoverTimers = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
    clearTimeout(leaveTimeoutRef.current);
    hoverTimeoutRef.current = null;
    leaveTimeoutRef.current = null;
  }, []);

  useEffect(() => () => {
    clearHoverTimers();
    clearTimeout(copyResetTimeoutRef.current);
    hideActivePopup(popupRef);
  }, [clearHoverTimers]);

  useEffect(() => {
    setRevealed(false);
  }, [name, secret]);

  const handleVarHover = useCallback((e, tokenString) => {
    clearHoverTimers();
    const target = e.currentTarget;
    hoverTimeoutRef.current = setTimeout(() => {
      const box = target.getBoundingClientRect();
      showVarInfoPopup({
        box,
        tokenString,
        options: { variables, collection },
        popupRef,
        clearHoverTimers
      });
    }, HOVER_DELAY_MS);
  }, [collection, variables, clearHoverTimers]);

  const handleVarLeave = useCallback(() => {
    clearHoverTimers();
    leaveTimeoutRef.current = setTimeout(() => {
      const popup = popupRef.current;
      if (popup && popup.contains(document.activeElement)) return;
      hideActivePopup(popupRef);
    }, HIDE_DELAY_MS);
  }, []);

  const handleCopy = useCallback(async (e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(getCopyText(value));
      setCopied(true);
      clearTimeout(copyResetTimeoutRef.current);
      copyResetTimeoutRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Clipboard can fail in insecure contexts fail silently.
    }
  }, [value]);

  const handleToggleReveal = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setRevealed((prev) => !prev);
  }, []);

  const rowActions = (
    <div className="row-actions">
      {secret && (
        <button
          type="button"
          className={`row-action-btn ${revealed ? 'is-pinned' : ''}`}
          onClick={handleToggleReveal}
          title={revealed ? 'Hide value' : 'Show value'}
          data-testid="variable-row-secret-toggle"
        >
          {revealed
            ? <IconEyeOff size={15} strokeWidth={1.5} />
            : <IconEye size={15} strokeWidth={1.5} />}
        </button>
      )}
      <button
        type="button"
        className={`row-action-btn ${copied ? 'copied' : ''}`}
        onClick={handleCopy}
        title="Copy value"
        data-testid="variable-row-copy"
      >
        {copied
          ? <IconCheck size={15} strokeWidth={2} />
          : <IconCopy size={15} strokeWidth={1.5} />}
      </button>
    </div>
  );

  let valueContent;

  if (isObjectOrArray(value) && !isMasked) {
    valueContent = (
      <button
        type="button"
        className={`object-preview ${isSelected ? 'is-selected' : ''}`}
        onClick={() => onOpenObject?.(value)}
        title="View object"
        data-testid="variable-object-preview"
      >
        {getCompactPreview(value)}
      </button>
    );
  } else if (typeof displayValue === 'string' && !isMasked && displayValue.includes('{{')) {
    const parts = displayValue.split(VAR_REF_PATTERN);
    valueContent = (
      <div className="value-text" title={displayValue}>
        {parts.map((part, index) => {
          if (part.startsWith('{{') && part.endsWith('}}')) {
            const status = getVarRefStatus(part, variables);
            return (
              <span
                key={`${part}-${index}`}
                className={`var-ref var-ref-${status}`}
                onMouseEnter={(e) => handleVarHover(e, part)}
                onMouseLeave={handleVarLeave}
                data-testid="variable-var-ref"
                data-status={status}
              >
                {part}
              </span>
            );
          }
          return <span key={`text-${index}`}>{part}</span>;
        })}
      </div>
    );
  } else {
    const text = displayValue == null ? '' : String(displayValue);
    valueContent = (
      <div className="value-text" title={isMasked ? undefined : text}>
        {text}
      </div>
    );
  }

  return (
    <StyledWrapper>
      <div className="value-content">
        {valueContent}
      </div>
      {rowActions}
    </StyledWrapper>
  );
};

export default VariableValue;
