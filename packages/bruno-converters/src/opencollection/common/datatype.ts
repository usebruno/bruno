import type { VariableTypedValue } from '@opencollection/types/common/variables';
import {
  parseValueByDataType,
  BrunoVariableDataType,
  isBrunoVariableDataType,
  valueToString
} from '@usebruno/common/utils';

export { BrunoVariableDataType, isBrunoVariableDataType };

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
  dataType?: BrunoVariableDataType;
}

export const hasTypedMetadata = (v: TypedVariableFields): boolean => {
  return !!v.dataType && v.dataType !== 'string';
};

export const toOpenCollectionTypedValue = (
  v: TypedVariableFields,
  dataStr: string
): VariableTypedValue => {
  return {
    type: (v.dataType || 'string') as VariableTypedValue['type'],
    data: dataStr
  };
};

// `'string'` is the implicit default — omitted from the result.
export const fromOpenCollectionTypedValue = (
  typed: VariableTypedValue
): { value: any } & TypedVariableFields => {
  const dataStr = typeof typed.data === 'string' ? typed.data : String(typed.data ?? '');
  const dataType: BrunoVariableDataType = isBrunoVariableDataType(typed.type) ? typed.type : 'string';
  const result: { value: any } & TypedVariableFields = {
    value: parseValueByDataType(dataStr, dataType)
  };
  if (dataType !== 'string') {
    result.dataType = dataType;
  }
  return result;
};
