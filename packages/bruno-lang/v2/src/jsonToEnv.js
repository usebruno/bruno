const _ = require('lodash');
const { getValueString, indentString } = require('./utils');

const getDescriptionSuffix = (variable) => {
  const desc = variable && variable.description && String(variable.description).trim();
  if (!desc) return '';
  // The BRU grammar's pair rule only allows trailing spaces after a value, so
  // appending @description after a triple-quoted multiline block would produce
  // unparseable output. Skip the annotation for multiline values.
  const valueIsMultiline
    = variable.value && (String(variable.value).includes('\n') || String(variable.value).includes('\r'));
  if (valueIsMultiline) {
    console.warn(`[bruno] Description for variable "${variable.name}" was not saved because multiline values cannot carry an inline @description annotation in BRU format.`);
    return '';
  }
  if (desc.includes('\'\'\'')) {
    return ' @description("' + desc.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '")';
  }
  return ' @description(\'\'\'' + desc.replace(/\\/g, '\\\\') + '\'\'\')';
};

const envToJson = (json) => {
  const variables = _.get(json, 'variables', []);
  const color = _.get(json, 'color', null);

  const vars = variables
    .filter((variable) => !variable.secret)
    .map((variable) => {
      const { name, value, enabled } = variable;
      const prefix = enabled ? '' : '~';

      return indentString(`${prefix}${name}: ${getValueString(value)}${getDescriptionSuffix(variable)}`);
    });

  const secretVars = variables
    .filter((variable) => variable.secret)
    .map((variable) => {
      const { name, enabled } = variable;
      const prefix = enabled ? '' : '~';
      return indentString(`${prefix}${name}`);
    });

  let output = '';

  if (!variables || !variables.length) {
    output += `vars {
}
`;
  }

  if (vars.length) {
    output += `vars {
${vars.join('\n')}
}
`;
  }

  if (secretVars.length) {
    output += `vars:secret [
${secretVars.join(',\n')}
]
`;
  }
  if (color) {
    output += `color: ${color}
`;
  }

  return output;
};

module.exports = envToJson;
