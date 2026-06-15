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

function serializeAnnotations(annotations) {
  if (!annotations?.length) return '';
  return (
    annotations
      .map((a) => {
        if (a.value === undefined) return `@${a.name}`;
        if (a.bru === 'triple' && !a.value.includes('\n') && !a.value.includes('\r') && !a.value.includes('\'\'\'')) {
          return `@${a.name}('''${a.value}''')`;
        }
        if (a.value.includes('\n') || a.value.includes('\r')) {
          return `@${a.name}('''\n${indentString(a.value)}\n''')`;
        }
        const quote = a.value.includes('\'') ? '"' : '\'';
        return `@${a.name}(${quote}${a.value}${quote})`;
      })
      .join('\n') + '\n'
  );
};

function applyDescriptionFromAnnotations(result, annotations) {
  const descriptionAnnotation = annotations?.find((annotation) => annotation.name === 'description');
  if (descriptionAnnotation) {
    result.description = descriptionAnnotation.value || '';
  }
  return result;
}

function getAnnotationsWithDescription(item) {
  const annotations = item?.annotations || [];
  if (!item || item.description == null || annotations.some((annotation) => annotation.name === 'description')) {
    return annotations;
  }
  const description = typeof item.description === 'string' ? item.description : item.description?.content || '';
  return [{ name: 'description', value: description, bru: 'triple' }, ...annotations];
}

function serializeAnnotationsForItem(item) {
  return serializeAnnotations(getAnnotationsWithDescription(item));
}

module.exports = {
  safeParseJson,
  indentString,
  outdentString,
  unescapeAnnotationDoubleQuotedArg,
  parseAnnotationMultilineTextBlock,
  getValueString,
  getKeyString,
  getValueUrl,
  serializeAnnotations,
  applyDescriptionFromAnnotations,
  getAnnotationsWithDescription,
  serializeAnnotationsForItem
};
