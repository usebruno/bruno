// we maintain cancel tokens for a request separately as redux does not recommend to store
// non-serializable value in the store

const cancelTokens = {};

export default cancelTokens;

export const saveCancelToken = (uid, axiosRequest) => {
  cancelTokens[uid] = axiosRequest;
};

export const deleteCancelToken = (uid) => {
  delete cancelTokens[uid];
};
