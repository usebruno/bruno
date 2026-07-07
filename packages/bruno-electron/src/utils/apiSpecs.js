const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const rawContent = (pathname) => {
  return fs.readFileSync(pathname, 'utf8');
};

const parseApiSpecContent = (pathname) => {
  const extension = path.extname(pathname).toLowerCase();
  const content = rawContent(pathname);

  try {
    if (extension === '.yaml' || extension === '.yml') {
      return yaml.load(content);
    } else if (extension === '.json') {
      return JSON.parse(content);
    }
  } catch {
    return null;
  }

  return null;
};

module.exports = { parseApiSpecContent, rawContent };
