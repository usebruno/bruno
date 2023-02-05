const _ = require('lodash');

const envToJson = (json) => {
  const variables = _.get(json, 'variables', []);
  const vars = variables.map((variable) => {
    const { name, value, enabled } = variable;
    const prefix = enabled ? '' : '~';
    return `  ${prefix}${name}: ${value}`;
  });

  if(!vars || !vars.length) {
    return `vars {
}
`;
  }

  const output = `vars {
${vars.join('\n')}
}
`;

  return output;
};

module.exports = envToJson;
