const addAxiosShimToContext = require('./axios');
const addNanoidShimToContext = require('./nanoid');
const addPathShimToContext = require('./path');
const addUuidShimToContext = require('./uuid');

const addLibraryShimsToContext = async (vm) => {
  await addNanoidShimToContext(vm);
  await addAxiosShimToContext(vm);
  await addUuidShimToContext(vm);
  await addPathShimToContext(vm);
};

module.exports = addLibraryShimsToContext;
