const _ = require('lodash');

const getValueString = (value) => {
  const hasNewLines = value?.includes('\n');

  if (!hasNewLines) {
    return value;
  }

  // Add 4-space indentation to the contents of the multiline string
  const indentedLines = value
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

  // Join the lines back together with newline characters and enclose them in triple single quotes
  return `'''\n${indentedLines}\n'''`;
};

const envToJson = (json) => {
  const variables = _.get(json, 'variables', []);
  const vars = variables
    .filter((variable) => !variable.secret)
    .map((variable) => {
      const { name, value, enabled } = variable;
      const prefix = enabled ? '' : '~';

      return `  ${prefix}${name}: ${getValueString(value)}`;
    });

  const secretVars = variables
    .filter((variable) => variable.secret)
    .map((variable) => {
      const { name, enabled } = variable;
      const prefix = enabled ? '' : '~';
      return `  ${prefix}${name}`;
    });

  if (!variables || !variables.length) {
    return `vars {
}
`;
  }

  let output = '';
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

  return output;
};

module.exports = envToJson;
