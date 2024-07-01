const addAxiosShimToContext = require('./axios');
const addNanoidShimToContext = require('./nanoid');
const addUuidShimToContext = require('./uuid');

const addLibraryShimsToContext = async (context) => {
  await addAxiosShimToContext(context);
  await addNanoidShimToContext(context);
  await addUuidShimToContext(context);
};

module.exports = addLibraryShimsToContext;
