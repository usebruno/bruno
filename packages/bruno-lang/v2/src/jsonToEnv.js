const _ = require('lodash');
const {
  getValueString,
  indentString,
  serializeAnnotations,
  buildAnnotationsFromVariable,
  escapeAnnotationDoubleQuotedArg,
  validatedEnvironmentExtendsFrom
} = require('./utils');

// Bare list entries end at a delimiter and are trimmed, so a name carrying one of these
// characters — or edge whitespace — only survives the round-trip quoted.
const quotableExtendsCharacters = ['[', ']', ',', '"'];

const serializeExtendsListValue = (name) => {
  const needsQuotes = quotableExtendsCharacters.some((character) => name.includes(character)) || name.trim() !== name;
  return needsQuotes ? `"${escapeAnnotationDoubleQuotedArg(name)}"` : name;
};

const jsonToEnv = (json) => {
  const variables = _.get(json, 'variables', []);
  const externalSecrets = _.get(json, 'externalSecrets', null);
  const color = _.get(json, 'color', null);
  const environmentExtendsFrom = validatedEnvironmentExtendsFrom(_.get(json, 'extends', null));

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

  if (typeof environmentExtendsFrom === 'string') {
    output += `extends: ${environmentExtendsFrom}
`;
  }

  if (Array.isArray(environmentExtendsFrom)) {
    output += `extends [
${environmentExtendsFrom.map((reference) => indentString(serializeExtendsListValue(reference))).join(',\n')}
]
`;
  }

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

module.exports = jsonToEnv;
