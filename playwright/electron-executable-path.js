const path = require('path');

const electronAppPath = path.join(__dirname, '../packages/bruno-electron');

/** Electron is a devDependency of bruno-electron; Playwright resolves it from that workspace. */
module.exports = require(path.join(electronAppPath, 'node_modules/electron'));
