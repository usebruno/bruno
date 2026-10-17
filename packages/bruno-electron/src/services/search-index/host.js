const { attachDatabase, shutdown: shutdownDatabase } = require('../sqlite');
const { SearchIndex } = require('./index');
const { FileIndex } = require('../mount/file-index');
const { indexCollection } = require('./indexer');

const port = process.parentPort;
const stopped = new Set();
let searchIndex = null;
let fileIndex = null;

const run = async ({ id, options }) => {
  try {
    await indexCollection(searchIndex, {
      ...options,
      fileIndex: options.fileCache ? fileIndex : null,
      onWork: () => port.postMessage({ type: 'work', id }),
      onWrite: () => port.postMessage({ type: 'write', id }),
      shouldStop: () => stopped.has(id)
    });
    port.postMessage({ type: 'done', id });
  } catch (err) {
    port.postMessage({ type: 'error', id, message: String(err?.message ?? err) });
  } finally {
    stopped.delete(id);
  }
};

port.on('message', ({ data }) => {
  if (data.type === 'init') {
    attachDatabase(data.userData);
    searchIndex = new SearchIndex();
    fileIndex = new FileIndex();
  } else if (data.type === 'index') {
    run(data);
  } else if (data.type === 'stop') {
    stopped.add(data.id);
  } else if (data.type === 'shutdown') {
    shutdownDatabase();
    process.exit(0);
  }
});
