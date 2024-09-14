import fs from 'fs';
import path from 'path';
import jsyaml from 'js-yaml';

export const readFile = (file) => {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        reject(err);
        return;  // Prevent further execution in case of error
      }

      const ext = path.extname(file);
      if (ext === '.json') {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (jsonErr) {
          reject(jsonErr);
        }
      } else if (ext === '.yaml' || ext === '.yml') {
        try {
          const yamlData = jsyaml.load(data, null);
          resolve(yamlData);
        } catch (yamlErr) {
          reject(yamlErr);
        }
      } else {
        reject(new Error('Unsupported file format'));
      }
    });
  });
};

export const saveFile = (data, fileName) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, data, (err) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
