import { uuid } from 'utils/common';
import { utils } from '@usebruno/common';

export const variablesToRaw = (variables) => {
  return utils.jsonToDotenv(variables);
};

export const rawToVariables = (rawContent) => {
  if (!rawContent || rawContent.trim() === '') {
    return [];
  }

  const variables = [];
  const lines = rawContent.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const name = trimmedLine.substring(0, equalIndex).trim();
    let value = trimmedLine.substring(equalIndex + 1);

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
      value = value.slice(1, -1);
      value = value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }

    if (name) {
      variables.push({
        uid: uuid(),
        name,
        value,
        enabled: true,
        secret: false
      });
    }
  }

  return variables;
};

export const MIN_TABLE_HEIGHT = 35 * 2;
