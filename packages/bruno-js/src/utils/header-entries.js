const buildHeaderEntries = (rows) => {
  const headers = {};
  const headerEntries = [];
  const enabledByKey = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!(row?.name?.length > 0)) continue;

    if (!row.enabled) {
      headerEntries.push({ key: row.name, value: row.value, disabled: true });
      continue;
    }

    headers[row.name] = row.value;
    const existing = enabledByKey.get(row.name);
    if (existing) {
      existing.value = row.value;
    } else {
      const entry = { key: row.name, value: row.value };
      enabledByKey.set(row.name, entry);
      headerEntries.push(entry);
    }
  }

  return { headers, headerEntries };
};

const setHeaderKey = (target, key, value) => {
  Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
};

const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);

const reconcileHeaderEntries = (entries, headers) => {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.disabled) continue;
    if (!hasOwn(headers, entry.key)) {
      entries.splice(i, 1);
    } else if (headers[entry.key] !== entry.value) {
      entry.value = headers[entry.key];
    }
  }

  for (const key of Object.keys(headers)) {
    if (!entries.some((entry) => !entry.disabled && entry.key === key)) {
      entries.push({ key, value: headers[key] });
    }
  }

  return entries;
};

const projectHeaderEntries = (entries, headers) => {
  const enabledKeys = new Set();

  for (const entry of entries) {
    if (entry.disabled) continue;
    enabledKeys.add(entry.key);
    if (!hasOwn(headers, entry.key) || headers[entry.key] !== entry.value) {
      setHeaderKey(headers, entry.key, entry.value);
    }
  }

  for (const key of Object.keys(headers)) {
    if (!enabledKeys.has(key)) {
      delete headers[key];
    }
  }

  return headers;
};

const liveHeaderEntries = (request) => {
  request.headers ??= {};
  request.headerEntries ??= [];

  return reconcileHeaderEntries(request.headerEntries, request.headers);
};

const orderedHeaderEntries = (request) => {
  const entries = liveHeaderEntries(request);
  const enabledByKey = new Map(entries.filter((entry) => !entry.disabled).map((entry) => [entry.key, entry]));
  return [
    ...entries.filter((entry) => entry.disabled),
    ...Object.keys(request.headers).map((key) => enabledByKey.get(key))
  ].map((entry) => ({ ...entry }));
};

const snapshotHeaderEntries = (source) => {
  if (Array.isArray(source)) {
    return source.map(({ name, value }) => ({ key: name, value }));
  }
  if (source && typeof source === 'object') {
    return Object.entries(source).map(([key, value]) => ({ key, value }));
  }
  return [];
};

const headerEntriesToObject = (entries, excludeDisabled, caseSensitive, multiValue, sanitizeKeys) => {
  const result = {};
  const ordered = [...entries.filter((entry) => entry.disabled), ...entries.filter((entry) => !entry.disabled)];
  for (const entry of ordered) {
    if (excludeDisabled && entry.disabled) continue;
    const key = caseSensitive === false ? entry.key.toLowerCase() : entry.key;
    if (sanitizeKeys && !key) continue;
    if (multiValue) {
      if (!(key in result)) {
        result[key] = entry.value;
      }
    } else {
      result[key] = entry.value;
    }
  }
  return result;
};

module.exports = {
  buildHeaderEntries,
  headerEntriesToObject,
  setHeaderKey,
  reconcileHeaderEntries,
  projectHeaderEntries,
  liveHeaderEntries,
  orderedHeaderEntries,
  snapshotHeaderEntries
};
