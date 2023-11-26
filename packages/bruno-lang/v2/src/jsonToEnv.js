const _ = require('lodash');

const envToJson = (json) => {
  const variables = _.get(json, 'variables', []);
  const vars = variables
    .filter((variable) => !variable.secret)
    .map((variable) => {
      const { name, value, enabled } = variable;
      const prefix = enabled ? '' : '~';
      return `  ${prefix}${name}: ${value}`;
    });

  const secretVars = variables
    .filter((variable) => variable.secret)
    .map((variable) => {
      const { name, enabled } = variable;
      const prefix = enabled ? '' : '~';
      return `  ${prefix}${name}`;
    });

  const color = _.get(json, 'color', undefined);

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
