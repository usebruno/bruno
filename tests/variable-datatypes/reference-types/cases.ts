export type MatrixCase = {
  referenced: string;
  selected: string;
  variable: string;
  flagged: boolean;
};

export const primitiveMatrix: MatrixCase[] = [
  { referenced: 'string', selected: 'string', variable: 'refStringFromString', flagged: false },
  { referenced: 'string', selected: 'number', variable: 'refNumberFromString', flagged: true },
  { referenced: 'number', selected: 'string', variable: 'refStringFromNumber', flagged: false },
  { referenced: 'number', selected: 'number', variable: 'refNumberFromNumber', flagged: false },
  { referenced: 'number', selected: 'boolean', variable: 'refBooleanFromNumber', flagged: true },
  { referenced: 'boolean', selected: 'boolean', variable: 'refBooleanFromBoolean', flagged: false },
  { referenced: 'boolean', selected: 'object', variable: 'refObjectFromBoolean', flagged: true },
  { referenced: 'object', selected: 'object', variable: 'refObjectFromObject', flagged: false },
  { referenced: 'object', selected: 'boolean', variable: 'refBooleanFromObject', flagged: true },
  { referenced: 'empty', selected: 'string', variable: 'refStringFromEmpty', flagged: false },
  { referenced: 'empty', selected: 'number', variable: 'refNumberFromEmpty', flagged: true }
];

export const nestedObjectMatrix: MatrixCase[] = [
  { referenced: 'nested object', selected: 'object', variable: 'refObjectFromNestedObject', flagged: false },
  { referenced: 'nested string', selected: 'string', variable: 'refStringFromNestedString', flagged: false },
  { referenced: 'nested number', selected: 'number', variable: 'refNumberFromNestedNumber', flagged: false },
  { referenced: 'nested boolean', selected: 'boolean', variable: 'refBooleanFromNestedBoolean', flagged: false },
  { referenced: 'nested string', selected: 'number', variable: 'refNumberFromNestedString', flagged: true },
  { referenced: 'nested number', selected: 'boolean', variable: 'refBooleanFromNestedNumber', flagged: true }
];

export const arrayMatrix: MatrixCase[] = [
  { referenced: 'array boolean', selected: 'string', variable: 'refStringFromArrayBoolean', flagged: false },
  { referenced: 'array boolean', selected: 'boolean', variable: 'refBooleanFromArrayBoolean', flagged: false },
  { referenced: 'array number', selected: 'number', variable: 'refNumberFromArrayNumber', flagged: false },
  { referenced: 'array', selected: 'object', variable: 'refObjectFromArray', flagged: false },
  { referenced: 'array boolean', selected: 'number', variable: 'refNumberFromArrayBoolean', flagged: true },
  { referenced: 'array boolean', selected: 'object', variable: 'refObjectFromArrayBoolean', flagged: true }
];

export const dottedKeyMatrix: MatrixCase[] = [
  { referenced: 'dotted-key boolean', selected: 'boolean', variable: 'refBooleanFromDottedKey', flagged: false }
];

// Proving a collection environment resolves against global variables.
export const collectionMatrix: MatrixCase[] = [
  { referenced: 'string', selected: 'string', variable: 'refStringFromGlobalString', flagged: false },
  { referenced: 'number', selected: 'number', variable: 'refNumberFromGlobalNumber', flagged: false },
  { referenced: 'boolean', selected: 'boolean', variable: 'refBooleanFromGlobalBoolean', flagged: false },
  { referenced: 'object', selected: 'object', variable: 'refObjectFromGlobalObject', flagged: false },
  { referenced: 'nested string', selected: 'string', variable: 'refStringFromGlobalNestedString', flagged: false },

  { referenced: 'string', selected: 'number', variable: 'refNumberFromGlobalString', flagged: true },
  { referenced: 'object', selected: 'boolean', variable: 'refBooleanFromGlobalObject', flagged: true },
  { referenced: 'empty', selected: 'number', variable: 'refNumberFromGlobalEmpty', flagged: true },
  { referenced: 'nested number', selected: 'boolean', variable: 'refBooleanFromGlobalNestedNumber', flagged: true }
];

export const sourceVariables = [
  'globalEnvString',
  'globalEnvNumber',
  'globalEnvBoolean',
  'globalEnvObject',
  'globalEnvNestedObject',
  'globalEnvObjectWithArray',
  'globalEnvEmpty',
  'globalEnvObject.port'
];
