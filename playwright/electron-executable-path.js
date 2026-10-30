const path = require('path');

const electronAppPath = path.join(__dirname, '../packages/bruno-electron');

/** Resolve the Electron binary from the bruno-electron workspace, hoisted or nested. */
module.exports = require(require.resolve('electron', { paths: [electronAppPath] }));
