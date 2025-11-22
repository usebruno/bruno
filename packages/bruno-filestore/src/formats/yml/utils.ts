import * as YAML from 'yaml';
const { customAlphabet } = require('nanoid');

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isNumber = (value: unknown): value is number => typeof value === 'number';

export const isNonEmptyString = (value: unknown): value is string => isString(value) && value.trim().length > 0;

export const stringifyYml = (obj: any): string => {
  return YAML.stringify(obj, {
    lineWidth: 0,
    indent: 2,
    minContentWidth: 0,
    defaultStringType: 'PLAIN'
  });
};

export const parseYml = (ymlString: string): any => {
  return YAML.parse(ymlString);
};

export const uuid = () => {
  // https://github.com/ai/nanoid/blob/main/url-alphabet/index.js
  const urlAlphabet = 'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  const customNanoId = customAlphabet(urlAlphabet, 21);

  return customNanoId();
};