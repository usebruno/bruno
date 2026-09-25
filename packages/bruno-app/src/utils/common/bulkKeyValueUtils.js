/**
 * Choose the best quote style for an annotation value.
 * Uses single quotes by default; switches to double quotes when the
 * value contains a single quote but no double quotes.
 */
function formatAnnotationArg(value) {
  const str = String(value);

  // Value contains single quote but no double quote -> use double quotes
  if (str.includes('\'') && !str.includes('"')) {
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  // Default: single quotes (escape backslashes and single quotes)
  return `'${str.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;
}

function serializeAnnotation(annotation) {
  if (annotation.value === undefined) {
    return `@${annotation.name}`;
  }
  return `@${annotation.name}(${formatAnnotationArg(annotation.value)})`;
}

function parseAnnotationLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('@')) return null;

  const match = trimmed.match(/^@([^\s():]+)(?:\((.*)\))?$/);
  if (!match) return null;

  const [, name, rawValue] = match;
  if (rawValue === undefined) {
    return { name };
  }

  let value = rawValue.trim();

  // Strip surrounding matching quotes
  if (
    (value.startsWith('\'') && value.endsWith('\''))
    || (value.startsWith('"') && value.endsWith('"'))
  ) {
    value = value.slice(1, -1);
  }

  // Unescape common sequences
  value = value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, '\'')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');

  return { name, value };
}

/**
 * Resolve annotations for serialization.
 * Prefers the standalone `description` field over any @description
 * that might exist in the annotations array.
 */
function resolveAnnotationsForSerialize(item) {
  const existing = item.annotations || [];
  const other = existing.filter((a) => a.name !== 'description');

  const description = item.description;
  if (description !== undefined && description !== null) {
    if (description !== '') {
      return [...other, { name: 'description', value: description }];
    }
    return other;
  }

  const descAnnot = existing.find((a) => a.name === 'description');
  return descAnnot ? [...other, descAnnot] : other;
}

export function serializeBulkKeyValue(items) {
  if (!items || !items.length) {
    return '';
  }

  return items
    .map((item) => {
      const annotations = resolveAnnotationsForSerialize(item);
      const annotationLines = annotations.map(serializeAnnotation);
      const enabledPrefix = item.enabled ? '' : '//';
      return [...annotationLines, `${enabledPrefix}${item.name}:${item.value}`].join('\n');
    })
    .join('\n');
}

export function parseBulkKeyValue(value) {
  if (!value || typeof value !== 'string') {
    return [];
  }

  const lines = value.split(/\r?\n/);
  const result = [];
  let pendingAnnotations = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    // Annotation line
    if (trimmed.startsWith('@')) {
      const annotation = parseAnnotationLine(trimmed);
      if (annotation) {
        pendingAnnotations.push(annotation);
      }
      continue;
    }

    // Key-value line (possibly disabled with //)
    const isEnabled = !trimmed.startsWith('//');
    const lineContent = isEnabled ? trimmed : trimmed.slice(2).trimStart();
    const sep = lineContent.indexOf(':');
    if (sep < 0) {
      continue;
    }

    const name = lineContent.slice(0, sep).trim();
    const val = lineContent.slice(sep + 1).trim();

    const item = { name, value: val, enabled: isEnabled };
    if (pendingAnnotations.length) {
      item.annotations = [...pendingAnnotations];
      const descAnnot = pendingAnnotations.find((a) => a.name === 'description');
      if (descAnnot) {
        item.description = descAnnot.value;
      }
      pendingAnnotations = [];
    }
    result.push(item);
  }

  // Dangling annotations at EOF are intentionally discarded
  return result;
}
