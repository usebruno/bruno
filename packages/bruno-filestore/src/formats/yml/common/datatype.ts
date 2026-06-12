import type { VariableTypedValue } from '@opencollection/types/common/variables';
import {
  parseValueByDatatype,
  BrunoVariableDatatype,
  isBrunoVariableDatatype,
  valueToString
} from '@usebruno/common/utils';

export { BrunoVariableDatatype, isBrunoVariableDatatype };

export const serializeVariableValue = (value: unknown): string => {
  if (value !== null && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return valueToString(value);
};

export const isTypedValue = (value: unknown): value is VariableTypedValue => {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && 'type' in value
    && 'data' in value;
};

export interface TypedVariableFields {
  datatype?: BrunoVariableDatatype;
}

export const hasTypedMetadata = (v: TypedVariableFields): boolean => {
  return !!v.datatype && v.datatype !== 'string';
};

export const toOpenCollectionTypedValue = (
  v: TypedVariableFields,
  dataStr: string
): VariableTypedValue => {
  return {
    type: (v.datatype || 'string') as VariableTypedValue['type'],
    data: dataStr
  };
};

// `'string'` is the implicit default — omitted from the result.
export const fromOpenCollectionTypedValue = (
  typed: VariableTypedValue
): { value: any } & TypedVariableFields => {
  const dataStr = typeof typed.data === 'string' ? typed.data : String(typed.data ?? '');
  const datatype: BrunoVariableDatatype = isBrunoVariableDatatype(typed.type) ? typed.type : 'string';
  const result: { value: any } & TypedVariableFields = {
    value: parseValueByDatatype(dataStr, datatype)
  };
  if (datatype !== 'string') {
    result.datatype = datatype;
  }
  return result;
};
