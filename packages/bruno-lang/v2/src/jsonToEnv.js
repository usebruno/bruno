const _ = require('lodash');

const envToJson = (json) => {
  const variables = _.get(json, 'variables', []);
  const vars = variables
    .filter((variable) => !variable.secret)
    .map((variable) => {
      const { name, value, enabled } = variable;
      const prefix = enabled ? '' : '~';

      // Check if value contains newlines or is formatted JSON/object
      if (value && (value.includes('\n') || value.includes('\r'))) {
        // Use multiline format with triple quotes
        const indentedValue = value.split('\n').map(line => `    ${line}`).join('\n');
        return `  ${prefix}${name}: '''\n${indentedValue}\n  '''`;
      }

      return `  ${prefix}${name}: ${value}`;
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
