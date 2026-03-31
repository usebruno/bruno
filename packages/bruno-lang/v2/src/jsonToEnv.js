const _ = require('lodash');
const { getValueString, indentString } = require('./utils');

const serializeAnnotations = (annotations) => {
  if (!annotations?.length) return '';
  return (
    annotations
      .map((a) => {
        if (a.value === undefined) return `@${a.name}`;
        if (a.value.includes('\n')) {
          return `@${a.name}('''\n${indentString(a.value)}\n''')`;
        }
        const quote = a.value.includes('\'') ? '"' : '\'';
        return `@${a.name}(${quote}${a.value}${quote})`;
      })
      .join('\n') + '\n'
  );
};

const envToJson = (json) => {
  const variables = _.get(json, 'variables', []);
  const color = _.get(json, 'color', null);

  const vars = variables
    .filter((variable) => !variable.secret)
    .map((variable) => {
      const { name, value, enabled, annotations } = variable;
      const prefix = enabled ? '' : '~';

      return indentString(`${serializeAnnotations(annotations)}${prefix}${name}: ${getValueString(value)}`);
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
