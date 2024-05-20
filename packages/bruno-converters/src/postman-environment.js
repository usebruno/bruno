import each from 'lodash/each';
import { BrunoError } from 'src/common/common';
import { readFile } from './common';

const isSecret = (type) => {
  return type === 'secret';
};

const importPostmanEnvironmentVariables = (brunoEnvironment, values) => {
  brunoEnvironment.variables = brunoEnvironment.variables || [];

  each(values, (i) => {
    const brunoEnvironmentVariable = {
      name: i.key,
      value: i.value,
      enabled: i.enabled,
      secret: isSecret(i.type)
    };

    brunoEnvironment.variables.push(brunoEnvironmentVariable);
  });
};

const importPostmanEnvironment = (environment) => {
  const brunoEnvironment = {
    name: environment.name,
    variables: []
  };

  importPostmanEnvironmentVariables(brunoEnvironment, environment.values);
  return brunoEnvironment;
};

const parsePostmanEnvironment = (environment) => {
  return new Promise((resolve, reject) => {
    try {
      return resolve(importPostmanEnvironment(environment));
    } catch (err) {
      console.log(err);
      if (err instanceof BrunoError) {
        return reject(err);
      }
      return reject(new BrunoError('Unable to parse the postman environment json file'));
    }
  });
};

export const importEnvironment = (fileName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const str = await readFile(fileName);
      const environment = await parsePostmanEnvironment(str);
      resolve(environment);
    } catch (err) {
      console.log(err);
      reject(new BrunoError('Import Environment failed'));
    }
  });
};
