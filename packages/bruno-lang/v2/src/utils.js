const { parseValueByDataType, BRUNO_VARIABLE_DATATYPES } = require('@usebruno/common/utils');

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

function serializeAnnotations(annotations) {
  if (!annotations?.length) return '';
  return (
    annotations
      .map((a) => {
        if (a.value === undefined) return `@${a.name}`;
        const strValue = String(a.value);
        if (strValue.includes('\n')) {
          return `@${a.name}('''\n${indentString(strValue)}\n''')`;
        }
        const quote = strValue.includes('\'') ? '"' : '\'';
        return `@${a.name}(${quote}${strValue}${quote})`;
      })
      .join('\n') + '\n'
  );
};

const buildAnnotationsFromVariable = (variable) => {
  const { annotations = [], dataType } = variable;
  // Drop any dataType annotations from the existing list; they'll be rebuilt from the dataType field
  const other = annotations.filter((a) => !BRUNO_VARIABLE_DATATYPES.includes(a.name));

  if (dataType && dataType !== 'string') {
    return [{ name: dataType }, ...other];
  }

  return other;
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

module.exports = {
  safeParseJson,
  indentString,
  outdentString,
  getValueString,
  getKeyString,
  getValueUrl,
  serializeAnnotations,
  extractTypedAnnotations,
  buildAnnotationsFromVariable,
  serializeVar
};
