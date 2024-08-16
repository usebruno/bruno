const addAxiosShimToContext = require('./axios');
const addNanoidShimToContext = require('./nanoid');

const addLibraryShimsToContext = async (vm) => {
  await addNanoidShimToContext(vm);
  await addAxiosShimToContext(vm);
};

module.exports = addLibraryShimsToContext;
