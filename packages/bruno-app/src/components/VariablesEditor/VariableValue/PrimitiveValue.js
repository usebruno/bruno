import React from 'react';
import get from 'lodash/get';
import { mockDataFunctions } from '@usebruno/common';
import { PROMPT_VARIABLE_TEXT_PATTERN } from '@usebruno/common/utils';

const VAR_REF_PATTERN = /(\{\{[^}]+\}\})/g;

export const getVarRefStatus = (tokenString, variables) => {
  const word = String(tokenString || '').replace(/^\{\{|\}\}$/g, '');
  if (!word) return 'invalid';
  if (PROMPT_VARIABLE_TEXT_PATTERN.test(word)) return 'prompt';

  const isMockVariable = word.startsWith('$')
    && Object.prototype.hasOwnProperty.call(mockDataFunctions, word.substring(1));
  if (isMockVariable) return 'valid';

  const { pathParams, ...rest } = variables || {};
  return get(rest, word) !== undefined ? 'valid' : 'invalid';
};

/** Split a string into plain text and interactive {{var}} tokens. */
export const VarRefText = ({ text, variables, onVarHover, onVarLeave }) => {
  const asString = String(text ?? '');
  if (!asString.includes('{{')) {
    return asString;
  }

  const interactive = typeof onVarHover === 'function';
  const parts = asString.split(VAR_REF_PATTERN);

  return parts.map((part, index) => {
    if (!(part.startsWith('{{') && part.endsWith('}}'))) {
      return <span key={`text-${index}`}>{part}</span>;
    }

    const status = getVarRefStatus(part, variables);
    if (!interactive) {
      return (
        <span key={`${part}-${index}`} className={`var-ref var-ref-${status}`}>
          {part}
        </span>
      );
    }

    return (
      <span
        key={`${part}-${index}`}
        className={`var-ref var-ref-${status}`}
        onMouseEnter={(e) => onVarHover(e, part)}
        onMouseLeave={onVarLeave}
        onClick={(e) => e.stopPropagation()}
        data-testid="variable-var-ref"
        data-status={status}
      >
        {part}
      </span>
    );
  });
};

/**
 * Shared leaf renderer for the value cell and JSON tree.
 * Strings are quoted; {{vars}} stay unquoted; numbers/bools/null use token colors.
 */
const PrimitiveValue = ({
  value,
  emptyDisplay = '(empty)',
  variables,
  onVarHover,
  onVarLeave
}) => {
  if (value === null || value === undefined) {
    return <span className="v-null">null</span>;
  }
  if (typeof value === 'number') {
    return <span className="v-num">{value}</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="v-bool">{String(value)}</span>;
  }

  const asString = String(value);
  if (asString === '') {
    return emptyDisplay == null
      ? null
      : <span className="empty-value">{emptyDisplay}</span>;
  }

  if (asString.includes('{{')) {
    return (
      <span className="v-str">
        <VarRefText
          text={asString}
          variables={variables}
          onVarHover={onVarHover}
          onVarLeave={onVarLeave}
        />
      </span>
    );
  }

  return <span className="v-str">&quot;{asString}&quot;</span>;
};

/** Top-level scalar cell (masked secrets, title, test ids). */
export const ScalarValue = ({
  value,
  masked = false,
  variables,
  onVarHover,
  onVarLeave
}) => {
  const title = masked || value == null || typeof value === 'object'
    ? undefined
    : String(value);

  return (
    <span
      className="value-text"
      title={title}
      data-testid="variable-value-text"
      data-masked={masked ? 'true' : 'false'}
    >
      {masked
        ? '********'
        : (
            <PrimitiveValue
              value={value}
              emptyDisplay={null}
              variables={variables}
              onVarHover={onVarHover}
              onVarLeave={onVarLeave}
            />
          )}
    </span>
  );
};

export default PrimitiveValue;
