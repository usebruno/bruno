const axios = require('axios');
const FormData = require('form-data');
const { ipcMain } = require('electron');
const { forOwn, extend } = require('lodash');
const { cancelTokens, saveCancelToken, deleteCancelToken } = require('../utils/cancel-token');

const registerNetworkIpc = () => {
  // handler for sending http request
  ipcMain.handle('send-http-request', async (event, request, options) => {
    try {
      // make axios work in node using form data
      // reference: https://github.com/axios/axios/issues/1006#issuecomment-320165427
      if(request.headers && request.headers['content-type'] === 'multipart/form-data') {
        const form = new FormData();
        forOwn(request.data, (value, key) => {
          form.append(key, value);
        });
        extend(request.headers, form.getHeaders());
        request.data = form;
      }

      if(options && options.cancelTokenUid) {
        const cancelToken = axios.CancelToken.source();
        request.cancelToken = cancelToken.token;
        saveCancelToken(options.cancelTokenUid, cancelToken);
      }

      const result = await axios(request);

      if(options && options.cancelTokenUid) {
        deleteCancelToken(options.cancelTokenUid);
      }

      return {
        status: result.status,
        headers: result.headers,
        data: result.data
      };
    } catch (error) {
      if(options && options.cancelTokenUid) {
        deleteCancelToken(options.cancelTokenUid);
      }

      return Promise.reject(error);
    }
  });

  ipcMain.handle('cancel-http-request', async (event, cancelTokenUid) => {
    return new Promise((resolve, reject) => {
      if(cancelTokenUid && cancelTokens[cancelTokenUid]) {
        cancelTokens[cancelTokenUid].cancel();
        deleteCancelToken(cancelTokenUid);
        resolve();
      } else {
        reject(new Error("cancel token not found"));
      }
    });
  });
};

module.exports = registerNetworkIpc;
