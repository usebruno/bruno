const fs = require('fs');
const path = require('path');

const makeNpmModule = (collectionPath, name, source) => {
  const modulePath = path.join(collectionPath, 'node_modules', name);
  fs.mkdirSync(modulePath, { recursive: true });
  fs.writeFileSync(path.join(modulePath, 'index.js'), source);
};

module.exports = {
  makeNpmModule
};
