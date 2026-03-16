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

/**
 * Like indentString but adds one extra indent level to lines inside @description('''...''') content
 * so multiline description content is indented relative to its key line, matching env multiline value behaviour.
 * When reading back, parsers strip those 4 spaces (2 block + 2 extra) to recover the original description.
 */
const indentWithDescription = (str, levels = 1) => {
  if (!str || !str.length) {
    return str || '';
  }

  const indent = '  '.repeat(levels);
  // split the string into lines
  const lines = str.split(/\r\n|\r|\n/);

  // tracks whether we're inside a multiline @description('''...''') block
  let inDescContent = false;
  const result = [];

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (inDescContent) {
      if (/^\s*'''\s*\)?\s*$/.test(trimmed)) {
        // closing ''' or ''') — exit description content and apply normal indent
        inDescContent = false;
        result.push(indent + line);
      } else {
        // description content line — add one extra indent level so it's visually nested
        result.push(indent + '  ' + line);
      }
    } else {
      // detect start of a multiline @description(''' — it ends with ''' but NOT with ''')
      // (single-line @description('''text''') ends with ''' ) so we skip those)
      if (trimmed.includes('@description(\'\'\'') && trimmed.endsWith('\'\'\'') && !trimmed.endsWith('\'\'\')')) {
        inDescContent = true;
      }
      result.push(indent + line);
    }
  }

  return result.join('\n');
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

module.exports = {
  safeParseJson,
  indentString,
  indentWithDescription,
  outdentString,
  getValueString,
  getKeyString,
  getValueUrl
};
