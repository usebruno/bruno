import fs from "fs";
import each from 'lodash/each';
import { readFile } from '../common';
import fileDialog from 'file-dialog';
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

const parsePostmanEnvironment = (str) => {
  return new Promise((resolve, reject) => {
    try {
      let environment = JSON.parse(str);
      return resolve(importPostmanEnvironment(environment));
    } catch (err) {
      console.log(err);
      if (err instanceof Error) {
        return reject(err);
      }
      return reject(new Error('Unable to parse the postman environment json file'));
    }
  });
};

const importEnvironment = () => {
  return new Promise((resolve, reject) => {
    fileDialog({ multiple: true, accept: 'application/json' })
      .then((files) => {
        return Promise.all(
          Object.values(files ?? {}).map((file) =>
            readFile([file])
              .then(parsePostmanEnvironment)
              .catch((err) => {
                console.error(`Error processing file: ${file.name || 'undefined'}`, err);
                throw err;
              })
          )
        );
      })
      .then((environments) => resolve(environments))
      .catch((err) => {
        console.log(err);
        reject(new Error('Import Environment failed'));
      });
  });
};

export const importEnvironmentFromFilepath = ({ filepath }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const fileContents = fs.readFileSync(filepath);
      const environment = await parsePostmanEnvironment(fileContents);
      resolve(environment);
    } catch (err) {
      console.log(err);
      reject(new Error('Import Environment failed'));
    }
  });
};

export default importEnvironment;
