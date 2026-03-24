const _ = require('lodash');
const { getValueString, indentString } = require('./utils');

const escapeDescriptionDouble = (s) =>
  String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');

/**
 * Emit @description as a prefix line before a key:value pair.
 * Using a prefix (instead of suffix) lets the value be multiline without conflict.
 */
const getDescriptionPrefix = (variable) => {
  const desc = variable && variable.description && String(variable.description).trim();
  if (!desc) return '';
  if (desc.includes('\'\'\'')) {
    return '@description("' + escapeDescriptionDouble(desc) + '")\n';
  }
  const descHasNewline = desc.includes('\n') || desc.includes('\r');
  if (descHasNewline) {
    const indented = desc.split('\n').map((line) => '  ' + line).join('\n');
    return '@description(\'\'\'\n' + indented + '\n\'\'\')\n';
  }
  return '@description(\'\'\'' + desc.replace(/\\/g, '\\\\') + '\'\'\')\n';
};

const envToJson = (json) => {
  const variables = _.get(json, 'variables', []);
  const color = _.get(json, 'color', null);

  const vars = variables
    .filter((variable) => !variable.secret)
    .map((variable) => {
      const { name, value, enabled } = variable;
      const prefix = enabled ? '' : '~';

      return indentString(`${getDescriptionPrefix(variable)}${prefix}${name}: ${getValueString(value)}`);
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
