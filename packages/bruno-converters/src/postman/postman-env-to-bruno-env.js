import each from 'lodash/each';
import { invalidVariableCharacterRegex } from '../constants';  
import { uuid } from '../common';

const isSecret = (type) => {
  return type === 'secret';
};

const importPostmanEnvironmentVariables = (brunoEnvironment, values) => {
  brunoEnvironment.variables = brunoEnvironment.variables || [];

  each(values, (i) => {
    const brunoEnvironmentVariable = {
      uid: uuid(),
      name: i.key.replace(invalidVariableCharacterRegex, '_'),
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

export const postmanToBrunoEnvironment = (postmanEnvironment) => {
  try {
    return importPostmanEnvironment(postmanEnvironment);
  } catch (err) {
    console.log(err);
    throw new Error('Unable to parse the postman environment json file');
  }
};

export default postmanToBrunoEnvironment;
