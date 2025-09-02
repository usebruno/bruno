const _ = require('lodash');
const { getValueString } = require('./utils');

// Env files use 4-space indentation for multiline content
// vars {
//   API_KEY: '''
//     -----BEGIN PUBLIC KEY-----
//     MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8
//     HMR5LXFFrwXQFE6xUVhXrxUpx1TtfoGkRcU7LEWV
//     -----END PUBLIC KEY-----
//   '''
// }
const indentLevel = 4;
const envToJson = (json) => {
  const variables = _.get(json, 'variables', []);
  const vars = variables
    .filter((variable) => !variable.secret)
    .map((variable) => {
      const { name, value, enabled } = variable;
      const prefix = enabled ? '' : '~';

      return `  ${prefix}${name}: ${getValueString(value, indentLevel)}`;
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
