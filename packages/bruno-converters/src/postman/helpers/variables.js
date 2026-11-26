import { uuid } from '../../common';
import { invalidVariableCharacterRegex } from '../../constants/index';
import { ensureString } from './values';

// Postman variable values may be any JSON type; Bruno stores strings.
export const toBrunoRequestVars = (variables) => (Array.isArray(variables) ? variables : [])
  .filter((variable) => variable != null && typeof variable === 'object')
  .filter((variable) => !(variable.key == null && variable.value == null))
  .map((variable) => ({
    uid: uuid(),
    name: ensureString(variable.key).replace(invalidVariableCharacterRegex, '_'),
    value: ensureString(variable.value),
    enabled: !variable.disabled
  }));
