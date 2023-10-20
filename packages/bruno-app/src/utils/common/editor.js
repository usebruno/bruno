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
  return items
    .map((item) => `${item.enabled ? '' : '//'}${item.name}:${item.value}`)
    .join('\n');
}
