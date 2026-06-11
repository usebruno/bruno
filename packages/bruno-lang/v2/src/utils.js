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

const getValueString = (value) => {
  // Handle null, undefined, and empty strings
  if (!value) {
    return '';
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

function serializeAnnotations(annotations) {
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

module.exports = {
  safeParseJson,
  indentString,
  outdentString,
  getValueString,
  getKeyString,
  getValueUrl,
  oauth2ClientAuthLines,
  serializeAnnotations
};
