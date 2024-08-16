const addNanoidShimToContext = require('./nanoid');

const addLibraryShimsToContext = async (context) => {
  await addNanoidShimToContext(context);
};

module.exports = addLibraryShimsToContext;
