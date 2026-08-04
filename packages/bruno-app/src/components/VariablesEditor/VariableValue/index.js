import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconArrowsMaximize, IconCheck, IconCopy, IconEye, IconEyeOff } from '@tabler/icons';
import { toDisplayString } from '@usebruno/common/utils';
import { getAllVariables } from 'utils/collections';
import JsonTreeValue from './JsonTreeValue';
import { ScalarValue, VarRefText } from './PrimitiveValue';
import { hideActivePopup, showVarInfoPopup } from './varInfoPopup';
import StyledWrapper from './StyledWrapper';

const HOVER_DELAY_MS = 50;
const HIDE_DELAY_MS = 500;
const COPY_FEEDBACK_MS = 1200;

const isObjectOrArray = (value) => value !== null && typeof value === 'object';

const getCopyText = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return toDisplayString(value, '');
};

const VariableValue = ({
  value,
  secret,
  collection,
  isSelected,
  revealed = false,
  onToggleReveal,
  onOpenObject,
  expandedPaths,
  onToggleExpanded
}) => {
  const popupRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const leaveTimeoutRef = useRef(null);
  const copyResetTimeoutRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const variables = useMemo(() => getAllVariables(collection), [collection]);
  const isMasked = !!secret && !revealed;
  const isObjectValue = isObjectOrArray(value) && !isMasked;

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

  const handleVarHover = useCallback((e, tokenString) => {
    clearHoverTimers();
    const target = e.currentTarget;
    hoverTimeoutRef.current = setTimeout(() => {
      showVarInfoPopup({
        box: target.getBoundingClientRect(),
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
      if (!popup || popup.contains(document.activeElement)) return;
      hideActivePopup(popupRef);
    }, HIDE_DELAY_MS);
  }, [clearHoverTimers]);

  const handleCopy = useCallback(async (e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(getCopyText(value));
      setCopied(true);
      clearTimeout(copyResetTimeoutRef.current);
      copyResetTimeoutRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Clipboard can fail in insecure contexts.
    }
  }, [value]);

  const stopAnd = useCallback((handler) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    handler?.();
  }, []);

  let valueContent;
  if (isObjectValue) {
    valueContent = (
      <div
        className="object-value value-tree-scroll"
        data-testid="variable-object-json"
      >
        <JsonTreeValue
          value={value}
          expandedPaths={expandedPaths}
          onToggle={onToggleExpanded}
          variables={variables}
          onVarHover={handleVarHover}
          onVarLeave={handleVarLeave}
        />
      </div>
    );
  } else if (!isMasked && typeof value === 'string' && value.includes('{{')) {
    valueContent = (
      <div className="value-text" title={value} data-testid="variable-value-text" data-masked="false">
        <VarRefText
          text={value}
          variables={variables}
          onVarHover={handleVarHover}
          onVarLeave={handleVarLeave}
        />
      </div>
    );
  } else {
    valueContent = (
      <ScalarValue
        value={value}
        masked={isMasked}
        variables={variables}
        onVarHover={handleVarHover}
        onVarLeave={handleVarLeave}
      />
    );
  }

  return (
    <StyledWrapper className={isObjectValue ? 'is-object' : undefined}>
      <div className="value-content">{valueContent}</div>
      <div className="row-actions">
        {isObjectValue && (
          <button
            type="button"
            className={`row-action-btn ${isSelected ? 'is-pinned is-selected' : ''}`}
            onClick={stopAnd(onOpenObject)}
            title="Open in drawer"
            aria-label="Open object in drawer"
            data-testid="variable-object-preview"
          >
            <IconArrowsMaximize size={15} strokeWidth={1.5} />
          </button>
        )}
        {secret && (
          <button
            type="button"
            className={`row-action-btn ${revealed ? 'is-pinned' : ''}`}
            onClick={stopAnd(onToggleReveal)}
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
    </StyledWrapper>
  );
};

export default VariableValue;
