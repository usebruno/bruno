import * as YAML from 'yaml';

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
