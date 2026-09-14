import { getDataTypeFromValue, toDisplayString } from '@usebruno/common/utils';
import { getScopedStorageKey } from 'components/CodeEditor/state-persistence';
import { VARIABLE_REFERENCE_PATTERN } from './constants';

export const isObjectOrArray = (value) => getDataTypeFromValue(value) === 'object';

export const holdsVariableReference = (value) => typeof value === 'string' && VARIABLE_REFERENCE_PATTERN.test(value);

/** Serialize for the value editor JSON so CodeMirror can color tokens. */
export const valueToEditorText = (value) => {
  if (value === undefined) return '';
  if (isObjectOrArray(value)) return toDisplayString(value, '');
  if (holdsVariableReference(value)) return value;
  return JSON.stringify(value) ?? '';
};

export const secretRevealKey = (section, name) => `${section}:${name}`;

/** Drop Variables persistence that is tied to a specific environment's values. */
export const clearEnvironmentBoundPersistence = (scope) => {
  if (!scope) return;

  const prefixes = [
    getScopedStorageKey(scope, 'variables-drawer:environment:'),
    getScopedStorageKey(scope, 'variables-cell:environment:')
  ];
  try {
    Object.keys(localStorage)
      .filter((key) => prefixes.some((prefix) => key.startsWith(prefix)))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable; leftover view state is harmless.
  }
};
