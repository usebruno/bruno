const _ = require('lodash');
const { getValueString, indentString, indentWithDescription } = require('./utils');

const escapeDescriptionDouble = (s) =>
  String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');

const getDescriptionSuffix = (variable) => {
  const desc = variable && variable.description && String(variable.description).trim();
  if (!desc) return '';
  const valueIsMultiline
    = variable.value && (String(variable.value).includes('\n') || String(variable.value).includes('\r'));
  if (valueIsMultiline) {
    console.warn(`[bruno] Description for variable "${variable.name}" was not saved because multiline values cannot carry an inline @description annotation in BRU format.`);
    return '';
  }
  if (desc.includes('\'\'\'')) {
    return ' @description("' + escapeDescriptionDouble(desc) + '")';
  }
  const descHasNewline = desc.includes('\n') || desc.includes('\r');
  if (descHasNewline) {
    return ' @description(\'\'\'\n' + desc.replace(/\\/g, '\\\\') + '\n\'\'\')';
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

      return indentWithDescription(`${prefix}${name}: ${getValueString(value)}${getDescriptionSuffix(variable)}`);
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
