import { uuid } from 'utils/common';

export const variablesToRaw = (variables) => {
  return variables
    .filter((v) => v.name && v.name.trim() !== '')
    .map((v) => {
      const value = v.value || '';
      if (value.includes('\n') || value.includes('"') || value.includes('\'')) {
        const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        return `${v.name}="${escapedValue}"`;
      }
      return `${v.name}=${value}`;
    })
    .join('\n');
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
