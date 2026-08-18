export function parseBulkKeyValue(value) {
  return value
    .split(/\r?\n/)
    .map((pair) => {
      const isEnabled = !pair.trim().startsWith('//');
      const cleanPair = pair.replace(/^\/\/\s*/, '');
      const sep = cleanPair.indexOf(':');
      if (sep < 0) return null;
      return {
        name: cleanPair.slice(0, sep).trim(),
        value: cleanPair.slice(sep + 1).trim(),
        enabled: isEnabled
      };
    })
    .filter(Boolean);
}

export function serializeBulkKeyValue(items) {
  return items.map((item) => `${item.enabled ? '' : '//'}${item.name}:${item.value}`).join('\n');
}

export function parseMultipartBulkKeyValue(value) {
  return value
    .split(/\r?\n/)
    .map((pair) => {
      const isEnabled = !pair.trim().startsWith('//');
      const cleanPair = pair.replace(/^\/\/\s*/, '');
      const fileSep = cleanPair.indexOf('@:');
      if (fileSep >= 0) {
        return {
          name: cleanPair.slice(0, fileSep).trim(),
          value: cleanPair
            .slice(fileSep + 2)
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean),
          enabled: isEnabled,
          type: 'file'
        };
      }
      const sep = cleanPair.indexOf(':');
      if (sep < 0) return null;
      return {
        name: cleanPair.slice(0, sep).trim(),
        value: cleanPair.slice(sep + 1).trim(),
        enabled: isEnabled,
        type: 'text'
      };
    })
    .filter(Boolean);
}

export function serializeMultipartBulkKeyValue(items) {
  return items
    .map((item) => {
      const enabled = item.enabled ? '' : '//';
      if (item.type === 'file') {
        const files = Array.isArray(item.value) ? item.value : item.value ? [item.value] : [];
        return `${enabled}${item.name}@:${files.join(',')}`;
      }
      return `${enabled}${item.name}:${item.value}`;
    })
    .join('\n');
}
