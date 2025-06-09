const cancelTokens = {};

const saveCancelToken = (uid, abortController) => {
  cancelTokens[uid] = abortController;
};

const deleteCancelToken = (uid) => {
  delete cancelTokens[uid];
};

const isCancelTokenValid = (uid) => {
  const abortController = cancelTokens?.[uid];
  return abortController && !abortController?.signal?.aborted
}

module.exports = {
  cancelTokens,
  saveCancelToken,
  deleteCancelToken,
  isCancelTokenValid
};
