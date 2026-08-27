const _ = require('lodash');
const { getValueString, indentString, serializeAnnotations, buildAnnotationsFromVariable } = require('./utils');

const envToJson = (json) => {
  const variables = _.get(json, 'variables', []);
  const externalSecrets = _.get(json, 'externalSecrets', null);
  const color = _.get(json, 'color', null);

  const vars = variables
    .filter((variable) => !variable.secret)
    .map((variable) => {
      const { name, value, enabled } = variable;
      const prefix = enabled ? '' : '~';
      const annotationPrefix = serializeAnnotations(buildAnnotationsFromVariable(variable));

      return indentString(`${annotationPrefix}${prefix}${name}: ${getValueString(value)}`);
    });

  const secretVars = variables
    .filter((variable) => variable.secret)
    .map((variable) => {
      const { name, enabled } = variable;
      const prefix = enabled ? '' : '~';
      const annotationPrefix = serializeAnnotations(buildAnnotationsFromVariable(variable));
      return indentString(`${annotationPrefix}${prefix}${name}`);
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

  if (externalSecrets && externalSecrets.type) {
    const serializedVariables = (externalSecrets.variables || []).map(({ name, value }) =>
      indentString(`${name}: ${getValueString(value)}`)
    );

    output += `vars:externalsecrets:${externalSecrets.type} {
${serializedVariables.join('\n')}
}
`;
  }

  if (color) {
    output += `color: ${color}
`;
  }

  return output;
};

module.exports = envToJson;
