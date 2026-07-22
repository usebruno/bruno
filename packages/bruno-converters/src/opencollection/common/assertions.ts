import { uuid } from '../../common/index.js';
import type {
  Assertion,
  BrunoKeyValue
} from '../types';

export const fromOpenCollectionAssertions = (assertions: Assertion[] | undefined): BrunoKeyValue[] => {
  if (!assertions?.length) {
    return [];
  }

  return assertions.map((a): BrunoKeyValue => ({
    uid: uuid(),
    name: a.expression || '',
    value: `${a.operator || 'eq'} ${a.value || ''}`.trim(),
    description: typeof a.description === 'string' ? a.description : a.description?.content || null,
    enabled: a.disabled !== true
  }));
};

export const toOpenCollectionAssertions = (assertions: BrunoKeyValue[] | null | undefined): Assertion[] | undefined => {
  if (!assertions?.length) {
    return undefined;
  }

  return assertions.map((a): Assertion => {
    const valueStr = a.value || '';
    const parts = valueStr.split(' ');
    const operator = parts[0] || 'eq';
    const value = parts.slice(1).join(' ');

    const ocAssertion: Assertion = {
      expression: a.name || '',
      operator,
      value
    };

    if (a.enabled === false) {
      ocAssertion.disabled = true;
    }

    if (a.description && typeof a.description === 'string' && a.description.trim().length) {
      ocAssertion.description = a.description;
    }

    return ocAssertion;
  });
};
