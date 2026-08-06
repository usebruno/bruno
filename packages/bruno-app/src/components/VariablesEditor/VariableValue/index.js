import React, { useCallback, useMemo } from 'react';
import { IconArrowsMaximize, IconCheck, IconCopy, IconEye, IconEyeOff } from '@tabler/icons';
import { getDataTypeFromValue, toDisplayString } from '@usebruno/common/utils';
import { useTheme } from 'providers/Theme';
import useCopyToClipboard from 'hooks/useCopyToClipboard';
import { usePersistenceScope } from 'hooks/usePersistedState/PersistedScopeProvider';
import SingleLineEditor from 'components/SingleLineEditor';
import MultiLineEditor from 'components/MultiLineEditor';
import { OBJECT_CELL_MAX_HEIGHT } from '../constants';
import StyledWrapper from './StyledWrapper';

const COPY_FEEDBACK_MS = 1200;
const JSON_MODE = 'application/ld+json';

const isObjectOrArray = (value) => getDataTypeFromValue(value) === 'object';

/** Serialize for the value editor JSON so CodeMirror can color tokens. */
const valueToEditorText = (value) => {
  if (value === undefined) return '';
  if (isObjectOrArray(value)) return toDisplayString(value, '');
  return JSON.stringify(value) ?? '';
};

const VariableValue = ({
  value,
  secret,
  name,
  collection,
  section,
  environmentUid,
  isSelected,
  revealed = false,
  onToggleReveal,
  onOpenObject
}) => {
  const { displayedTheme } = useTheme();
  const persistenceScope = usePersistenceScope();
  const { copied, copyToClipboard } = useCopyToClipboard(COPY_FEEDBACK_MS);

  const isMasked = !!secret && !revealed;
  const isObjectValue = isObjectOrArray(value);
  // Masked secrets stay single-line so line numbers / fold gutters don't show.
  const isMultiline = isObjectValue && !isMasked;
  // Serializing a large object is not free, and rows re-render on scroll.
  const editorValue = useMemo(
    () => (isMasked ? '********' : valueToEditorText(value)),
    [isMasked, value]
  );

  const cellDocKey = !isMultiline
    ? undefined
    : section === 'environment'
      ? `variables-cell:environment:${environmentUid || 'none'}:${name}`
      : `variables-cell:${section}:${name}`;

  const handleCopy = useCallback(() => {
    // Clipboard can fail in insecure contexts.
    copyToClipboard(toDisplayString(value, '')).catch(() => {});
  }, [copyToClipboard, value]);

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
    >
      {isMultiline ? (
        <MultiLineEditor
          {...editorProps}
          hideSecretEye
          enableFolding
          autoHeight
          maxHeight={OBJECT_CELL_MAX_HEIGHT}
          containOverscroll
          docKey={cellDocKey}
          persistenceScope={persistenceScope}
        />
      ) : (
        <SingleLineEditor {...editorProps} />
      )}
    </div>
  );

  return (
    <StyledWrapper className={isMultiline ? 'is-object' : undefined}>
      <div className="value-content">{valueContent}</div>
      <div className="row-actions">
        {isObjectValue && !isMasked && (
          <button
            type="button"
            className={`row-action-btn ${isSelected ? 'is-pinned is-selected' : ''}`}
            onClick={onOpenObject}
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
            onClick={onToggleReveal}
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
