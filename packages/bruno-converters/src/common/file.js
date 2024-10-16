import fs from 'fs';
import path from 'path';
import jsyaml from 'js-yaml';
import { safeParseJSON } from './index';

export const readFile = async (file) => {
  try {
    return await fs.promises.readFile(file, 'utf8');
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const parseFile = async (file) => {
  try {
    const data = await readFile(file);
    const ext = path.extname(file).toLowerCase();

    if (ext === '.json') {
      return safeParseJSON(data);
    } else if (ext === '.yaml' || ext === '.yml') {
      return jsyaml.load(data,null);
    } else {
      throw new Error('Unsupported file format');
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const saveFile = async (data, fileName) => {
  try {
    await fs.promises.writeFile(fileName, data);
  } catch (err) {
    console.error(err);
    throw err;
  }
};
