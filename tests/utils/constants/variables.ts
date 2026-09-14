export type VariableDataType = 'string' | 'number' | 'boolean' | 'object';

export type SecretDatatypeCase = {
  dataType: Exclude<VariableDataType, 'string'>;
  varName: string;
  value: string;
  revealContains: string;
};

export const SECRET_DATATYPE_CASES: SecretDatatypeCase[] = [
  { dataType: 'number', varName: 'secretNumber', value: '12345', revealContains: '12345' },
  { dataType: 'boolean', varName: 'secretBoolean', value: 'true', revealContains: 'true' },
  { dataType: 'object', varName: 'secretObject', value: '{"k":1}', revealContains: '"k"' }
];
