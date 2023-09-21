const cancelTokens = {};

const saveCancelToken = (uid, axiosRequest) => {
  cancelTokens[uid] = axiosRequest;
};

const deleteCancelToken = (uid) => {
  delete cancelTokens[uid];
};

module.exports = {
  cancelTokens,
  saveCancelToken,
  deleteCancelToken
};
