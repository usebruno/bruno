import React, { useCallback, useMemo } from 'react';
import { IconArrowsDiagonal, IconCheck, IconCopy, IconEye, IconEyeOff } from '@tabler/icons';
import { toDisplayString } from '@usebruno/common/utils';
import { useTheme } from 'providers/Theme';
import useCopyToClipboard from 'hooks/useCopyToClipboard';
import { usePersistenceScope } from 'hooks/usePersistedState/PersistedScopeProvider';
import SingleLineEditor from 'components/SingleLineEditor';
import MultiLineEditor from 'components/MultiLineEditor';
import { COPY_FEEDBACK_MS, JSON_MODE, OBJECT_CELL_MAX_HEIGHT } from '../constants';
import { holdsVariableReference, isObjectOrArray, valueToEditorText } from '../utils';
import StyledWrapper from './StyledWrapper';

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
  // Text that is not JSON would be tokenized as a JSON error and painted red.
  const isPlainText = isMasked || holdsVariableReference(value);
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
      ? `variables-cell:environment:${environmentUid}:${name}`
      : `variables-cell:${section}:${name}`;

  const handleCopy = useCallback(() => {
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
    mode: isPlainText ? 'text/plain' : JSON_MODE
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
            className={`row-action-btn ${isSelected ? 'is-pinned' : ''}`}
            onClick={onOpenObject}
            title="Open in drawer"
            aria-label="Open object in drawer"
            data-testid="variable-object-preview"
          >
            <IconArrowsDiagonal size={15} strokeWidth={1.5} />
          </button>
        )}
        {secret && (
          <button
            type="button"
            className={`row-action-btn ${revealed ? 'is-pinned' : ''}`}
            onClick={onToggleReveal}
            title={revealed ? 'Hide value' : 'Show value'}
            aria-label={revealed ? 'Hide value' : 'Show value'}
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
