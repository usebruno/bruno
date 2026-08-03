const BRUNO_VARIABLE_DATATYPES = ['string', 'number', 'boolean', 'object'];

const parseValueByDataType = (value, dataType) => {
  if (!dataType || dataType === 'string') return value;
  try {
    if (dataType === 'number') {
      if (typeof value === 'number') return value;
      const trimmed = typeof value === 'string' ? value.trim() : value;
      if (trimmed === '' || trimmed == null) return value;
      const num = Number(trimmed);
      if (!Number.isNaN(num)) return num;
    } else if (dataType === 'boolean') {
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
    } else if (dataType === 'object') {
      if (typeof value === 'object' && value !== null) return value;
      const trimmed = typeof value === 'string' ? value.trim() : value;
      if (trimmed === '' || trimmed == null) return value;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed !== null && typeof parsed === 'object') return parsed;
      } catch (_) {
        // not JSON — fall through
      }
    }
  } catch (_) {
    // fall through
  }
  return value;
};

// safely parse json
const safeParseJson = (json) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

const indentString = (str, levels = 1) => {
  if (!str || !str.length) {
    return str || '';
  }

  const indent = '  '.repeat(levels);
  return str
    .split(/\r\n|\r|\n/)
    .map((line) => indent + line)
    .join('\n');
};

const outdentString = (str, spaces = 2) => {
  if (!str || !str.length) {
    return str || '';
  }

  const spacesRegex = new RegExp(`^ {${spaces}}`);
  return str
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(spacesRegex, ''))
    .join('\n');
};

const parseAnnotationMultilineTextBlock = (content) => {
  if (!content || !content.length) {
    return '';
  }

  if (!content.includes('\n') && !content.includes('\r')) {
    return content;
  }

  const lineEnding = content.includes('\r\n') ? '\r\n' : content.includes('\r') ? '\r' : '\n';
  const lines = content.split(/\r\n|\r|\n/);

  if (lines.length > 0 && lines[0] === '') lines.shift();
  if (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

  const nonEmptyLines = lines.filter((line) => line.trim() !== '');
  const minIndent = nonEmptyLines.length
    ? Math.min(...nonEmptyLines.map((line) => line.match(/^[ \t]*/)[0].length))
    : 0;

  return lines
    .map((line) => (line.trim() === '' ? '' : line.substring(minIndent)))
    .join(lineEnding);
};

const unescapeAnnotationDoubleQuotedArg = (value) =>
  value.replace(/\\(r|n|t|"|\\)/g, (_, char) => {
    switch (char) {
      case 'r':
        return '\r';
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case '"':
        return '"';
      case '\\':
        return '\\';
      default:
        return char;
    }
  });

const escapeAnnotationDoubleQuotedArg = (value) =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

// Escapes a multiline description's own delimiter (''') so it can safely round-trip
// inside a '''...''' block. Any pre-existing \' must be doubled first so decoding
// can tell it apart from the backslashes introduced by escaping '''.
const escapeMultilineDescription = (value) =>
  value.split('\\\'').join('\\\\\'').split('\'\'\'').join('\\\'\\\'\\\'');

const unescapeMultilineDescription = (value) =>
  value.split('\\\'\\\'\\\'').join('\'\'\'').split('\\\\\'').join('\\\'');

const getValueString = (value) => {
  // Handle null, undefined, and empty strings
  if (!value && value !== 0 && value !== false) {
    return '';
  }

  // Stringify non-string values (objects, numbers, booleans)
  if (typeof value !== 'string') {
    value = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  }

  const hasNewLines = value.includes('\n') || value.includes('\r');

  if (!hasNewLines) {
    return value;
  }

  // Wrap multiline values in triple quotes with 2-space indentation
  return `'''\n${indentString(value)}\n'''`;
};

const getKeyString = (key) => {
  const quotableChars = [':', '"', '{', '}', ' '];
  return quotableChars.some((char) => key.includes(char)) ? ('"' + key.replaceAll('"', '\\"') + '"') : key;
};

const getValueUrl = (url) => {
  // Handle null, undefined, and empty strings
  if (!url) {
    return '';
  }

  const hasNewLines = url.includes('\n') || url.includes('\r');

  if (!hasNewLines) {
    return url;
  }

  // Wrap multiline values in triple quotes with 4-space indentation (2 levels)
  return `'''\n${indentString(url, 2)}\n'''`;
};

// Builds the OAuth2 client-authentication serialization lines: the RFC 7591 §2 / OIDC Core §9
// token_endpoint_auth_method line plus any JWT-bearer-assertion fields (RFC 7521 / 7523) that are
// set. Replaces the legacy `credentials_placement` line; collections that still carry
// credentialsPlacement on the in-memory object have already been migrated to tokenEndpointAuthMethod
// by the parser.
const oauth2ClientAuthLines = (oauth2) => {
  const method = oauth2?.tokenEndpointAuthMethod || 'client_secret_post';
  const lines = [indentString(`token_endpoint_auth_method: ${method}`)];

  if (oauth2?.tokenEndpointAuthSigningAlg) {
    lines.push(indentString(`token_endpoint_auth_signing_alg: ${oauth2.tokenEndpointAuthSigningAlg}`));
  }
  if (oauth2?.privateKey) {
    const value = oauth2?.privateKeyType === 'file'
      ? `@file(${oauth2.privateKey})`
      : getValueString(oauth2.privateKey);
    lines.push(indentString(`private_key: ${value}`));
  }
  if (oauth2?.privateKeyFormat) {
    lines.push(indentString(`private_key_format: ${oauth2.privateKeyFormat}`));
  }
  if (oauth2?.keyId) {
    lines.push(indentString(`key_id: ${oauth2.keyId}`));
  }
  if (oauth2?.audience) {
    lines.push(indentString(`audience: ${oauth2.audience}`));
  }
  if (oauth2?.assertionLifetime != null && oauth2.assertionLifetime !== '') {
    lines.push(indentString(`assertion_lifetime: ${oauth2.assertionLifetime}`));
  }

  return lines.join('\n');
};

const formatAnnotationArg = (strValue) => {
  if (strValue.includes('\'\'\'') || strValue.includes('\'')) {
    return `"${escapeAnnotationDoubleQuotedArg(strValue)}"`;
  }
  return `'${strValue}'`;
};

function serializeAnnotations(annotations) {
  if (!annotations?.length) return '';
  return (
    annotations
      .map((a) => {
        if (a.value === undefined) return `@${a.name}`;
        const strValue = String(a.value);
        if (strValue.includes('\n')) {
          const blockValue = a.name === 'description' ? escapeMultilineDescription(strValue) : strValue;
          return `@${a.name}('''\n${indentString(blockValue)}\n''')`;
        }
        return `@${a.name}(${formatAnnotationArg(strValue)})`;
      })
      .join('\n') + '\n'
  );
};

const resolveDescriptionAnnotations = (annotations, description) => {
  const other = (annotations || []).filter((a) => a.name !== 'description');
  if (description !== undefined && description !== null) {
    if (description !== '') {
      return { descArr: [{ name: 'description', value: description }], other };
    }
    return { descArr: [], other };
  }
  const descAnnotation = (annotations || []).find((a) => a.name === 'description');
  const descArr = descAnnotation !== undefined ? [descAnnotation] : [];
  return { descArr, other };
};

const buildAnnotationsFromVariable = (variable) => {
  const { annotations = [], dataType, description } = variable;
  const dataTypeFiltered = annotations.filter((a) => !BRUNO_VARIABLE_DATATYPES.includes(a.name));
  const { descArr, other } = resolveDescriptionAnnotations(dataTypeFiltered, description);

  if (dataType && dataType !== 'string') {
    return [{ name: dataType }, ...descArr, ...other];
  }

  return [...descArr, ...other];
};

const extractTypedAnnotations = (rawAnnotations, result) => {
  if (!rawAnnotations?.length) return;

  const annotation = rawAnnotations.findLast((a) => BRUNO_VARIABLE_DATATYPES.includes(a.name));
  // 'string' is the implicit default — don't materialize it as an explicit dataType field
  if (!annotation || annotation.name === 'string') return;

  result.dataType = annotation.name;
  result.value = parseValueByDataType(result.value, result.dataType);
};

const serializeVar = (item, prefix = '') => {
  return `${serializeAnnotations(buildAnnotationsFromVariable(item))}${prefix}${item.name}: ${getValueString(item.value)}`;
};

const applyDescriptionFromAnnotations = (result, annotations) => {
  if (!annotations?.length) return;
  const descAnnotation = annotations.find((a) => a.name === 'description');
  if (descAnnotation !== undefined) {
    const value = descAnnotation.value ?? '';
    result.description = typeof value === 'string' && value.includes('\n') ? unescapeMultilineDescription(value) : value;
  }
};

const buildAnnotationsFromKVItem = (item) => {
  const { descArr, other } = resolveDescriptionAnnotations(item.annotations, item.description);
  return [...descArr, ...other];
};

module.exports = {
  safeParseJson,
  indentString,
  outdentString,
  unescapeAnnotationDoubleQuotedArg,
  escapeMultilineDescription,
  unescapeMultilineDescription,
  parseAnnotationMultilineTextBlock,
  getValueString,
  getKeyString,
  getValueUrl,
  oauth2ClientAuthLines,
  serializeAnnotations,
  extractTypedAnnotations,
  buildAnnotationsFromVariable,
  serializeVar,
  applyDescriptionFromAnnotations,
  buildAnnotationsFromKVItem
};
