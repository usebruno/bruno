// assigning for a reserved key like '__proto__' works with defineProperty by not polluting the object prototype.
const setMetadataKey = (target, key, value) => {
  Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
};

/**
 * Normalizes the `[{ name, value }]` display shape the response pane renders into a plain object.
 * Multi-valued keys are already joined into one comma-separated string upstream.
 */
const toMetadataObject = (entries) => {
  if (!Array.isArray(entries)) {
    return {};
  }

  return entries.reduce((acc, { name, value }) => {
    setMetadataKey(acc, name, value);
    return acc;
  }, {});
};

module.exports = { toMetadataObject, setMetadataKey };
