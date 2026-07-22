import type { KeyValue as BrunoKeyValue } from '@usebruno/schema-types/common/key-value';
import type { Assertion } from '@opencollection/types/common/assertions';
import { uuid, ensureString } from '../../../utils';

const OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'notIn',
  'contains',
  'notContains',
  'length',
  'matches',
  'notMatches',
  'startsWith',
  'endsWith',
  'between',
  'isEmpty',
  'isNotEmpty',
  'isNull',
  'isUndefined',
  'isDefined',
  'isTruthy',
  'isFalsy',
  'isJson',
  'isNumber',
  'isString',
  'isBoolean',
  'isArray'
] as const;

const UNARY_OPERATORS = [
  'isEmpty',
  'isNotEmpty',
  'isNull',
  'isUndefined',
  'isDefined',
  'isTruthy',
  'isFalsy',
  'isJson',
  'isNumber',
  'isString',
  'isBoolean',
  'isArray'
] as const;

type Operator = typeof OPERATORS[number];

const parseAssertionOperator = (str: string = ''): { operator: Operator; value: string | undefined } => {
  if (!str || typeof str !== 'string' || !str.length) {
    return {
      operator: 'eq',
      value: str
    };
  }

  const [firstWord, ...rest] = str.trim().split(' ');
  const remainingValue = rest.join(' ');

  // Check if first word is a unary operator
  if (UNARY_OPERATORS.includes(firstWord as any)) {
    return {
      operator: firstWord as Operator,
      value: undefined
    };
  }

  // Check if first word is any recognized operator
  if (OPERATORS.includes(firstWord as any)) {
    return {
      operator: firstWord as Operator,
      value: remainingValue
    };
  }

  // If not a recognized operator, treat the whole string as value with 'eq' operator
  return {
    operator: 'eq',
    value: str
  };
};

export const toOpenCollectionAssertions = (assertions: BrunoKeyValue[] | null | undefined): Assertion[] | undefined => {
  if (!assertions?.length) {
    return undefined;
  }

  const ocAssertions: Assertion[] = assertions.map((assertion: BrunoKeyValue): Assertion => {
    const { operator, value } = parseAssertionOperator(assertion.value || '');

    const ocAssertion: Assertion = {
      expression: assertion.name || '',
      operator,
      ...(value !== undefined && { value })
    };

    if (assertion?.description?.trim().length) {
      ocAssertion.description = assertion.description;
    }

    if (assertion.enabled === false) {
      ocAssertion.disabled = true;
    }

    return ocAssertion;
  });

  return ocAssertions.length > 0 ? ocAssertions : undefined;
};

export const toBrunoAssertions = (assertions: Assertion[] | null | undefined): BrunoKeyValue[] | undefined => {
  if (!assertions?.length) {
    return undefined;
  }

  const brunoAssertions: BrunoKeyValue[] = assertions.map((assertion: Assertion): BrunoKeyValue => {
    // Reconstruct the "operator value" format that Bruno uses
    let valueString = ensureString(assertion.operator);
    if (assertion.value !== undefined && assertion.value !== null) {
      valueString = `${assertion.operator} ${ensureString(assertion.value)}`;
    }

    const brunoAssertion: BrunoKeyValue = {
      uid: uuid(),
      name: ensureString(assertion.expression),
      value: valueString,
      enabled: assertion.disabled !== true
    };

    if (assertion.description) {
      if (typeof assertion.description === 'string' && assertion.description.trim().length) {
        brunoAssertion.description = assertion.description;
      } else if (typeof assertion.description === 'object' && assertion.description.content?.trim().length) {
        brunoAssertion.description = assertion.description.content;
      }
    }

    return brunoAssertion;
  });

  return brunoAssertions.length > 0 ? brunoAssertions : undefined;
};
