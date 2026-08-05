import React, { useCallback, useRef, useState } from 'react';
import { IconArrowsMaximize, IconCheck, IconCopy, IconEye, IconEyeOff } from '@tabler/icons';
import { toDisplayString } from '@usebruno/common/utils';
import { useTheme } from 'providers/Theme';
import SingleLineEditor from 'components/SingleLineEditor';
import MultiLineEditor from 'components/MultiLineEditor';
import StyledWrapper from './StyledWrapper';

const COPY_FEEDBACK_MS = 1200;
const JSON_MODE = 'application/ld+json';

const isObjectOrArray = (value) => value !== null && typeof value === 'object';

const getCopyText = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return toDisplayString(value, '');
};

/** Serialize for the value editor JSON so CodeMirror can color tokens. */
const valueToEditorText = (value) => {
  if (value === undefined) return '';
  try {
    return isObjectOrArray(value)
      ? JSON.stringify(value, null, 2)
      : JSON.stringify(value);
  } catch {
    return '';
  }
};

const VariableValue = ({
  value,
  secret,
  name,
  collection,
  isSelected,
  revealed = false,
  onToggleReveal,
  onOpenObject
}) => {
  const { displayedTheme } = useTheme();
  const copyResetTimeoutRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const isMasked = !!secret && !revealed;
  const isMultiline = isObjectOrArray(value);
  const editorValue = isMasked ? '********' : valueToEditorText(value);

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

  const preventRowClick = useCallback((handler) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    handler?.();
  }, []);

  const editorProps = {
    theme: displayedTheme,
    collection,
    name: name ? `var.${name}` : 'var.value',
    value: editorValue,
    readOnly: true,
    enableBrunoVarInfo: !isMasked,
    isSecret: false,
    // Masked placeholder is plain text; real values use JSON for token colors.
    mode: isMasked ? 'text/plain' : JSON_MODE
  };

  const valueContent = (
    <div
      className={`value-editor${isMultiline ? ' is-multiline' : ''}`}
      data-testid={isMultiline ? 'variable-multiline-editor' : 'variable-singleline-editor'}
      data-readonly="true"
      onClick={(e) => e.stopPropagation()}
    >
      {isMultiline ? (
        <MultiLineEditor {...editorProps} hideSecretEye />
      ) : (
        <SingleLineEditor {...editorProps} />
      )}
    </div>
  );

  return (
    <StyledWrapper className={isMultiline ? 'is-object' : undefined}>
      <div className="value-content">{valueContent}</div>
      <div className="row-actions">
        {isMultiline && !isMasked && (
          <button
            type="button"
            className={`row-action-btn ${isSelected ? 'is-pinned is-selected' : ''}`}
            onClick={preventRowClick(onOpenObject)}
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
            onClick={preventRowClick(onToggleReveal)}
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
