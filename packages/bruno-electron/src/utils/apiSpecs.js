const yaml = require('js-yaml');

const parseApiSpecContent = (content, extension) => {
  const ext = (extension || '').toLowerCase();

  try {
    if (ext === '.yaml' || ext === '.yml') {
      return yaml.load(content);
    } else if (ext === '.json') {
      return JSON.parse(content);
    }
  } catch {
    return null;
  }

  return null;
};

module.exports = { parseApiSpecContent };
