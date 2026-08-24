/**
 * Normalizes the `[{ name, value }]` display shape the response pane renders into a plain object.
 * Multi-valued keys are already joined into one comma-separated string upstream.
 */
const toMetadataObject = (entries) => {
  if (!Array.isArray(entries)) {
    return {};
  }

  return entries.reduce((acc, { name, value }) => {
    acc[name] = value;
    return acc;
  }, {});
};

module.exports = { toMetadataObject };
