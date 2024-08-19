const addAxiosShimToContext = require('./axios');
const addNanoidShimToContext = require('./nanoid');
const addNodeFetchShimToContext = require('./node-fetch');
const addUuidShimToContext = require('./uuid');

const addLibraryShimsToContext = async (vm) => {
  await addNanoidShimToContext(vm);
  await addAxiosShimToContext(vm);
  await addNodeFetchShimToContext(vm);
  await addUuidShimToContext(vm);
};

module.exports = addLibraryShimsToContext;
