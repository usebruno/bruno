const axios = require('axios');
const FormData = require('form-data');
const { ipcMain } = require('electron');
const { forOwn, extend } = require('lodash');
const { ScriptRuntime } = require('@usebruno/js');
const prepareRequest = require('./prepare-request');
const { cancelTokens, saveCancelToken, deleteCancelToken } = require('../../utils/cancel-token');
const { uuid } = require('../../utils/common');
const interpolateVars = require('./interpolate-vars');

const registerNetworkIpc = (mainWindow, watcher, lastOpenedCollections) => {
  // handler for sending http request
  ipcMain.handle('send-http-request', async (event, item, collectionUid, environment) => {
    const cancelTokenUid = uuid();

    try {
      const _request = item.draft ? item.draft.request : item.request;
      const request = prepareRequest(_request, environment);

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

      const cancelToken = axios.CancelToken.source();
      request.cancelToken = cancelToken.token;
      saveCancelToken(cancelTokenUid, cancelToken);

      if(request.script && request.script.length) {
        request.script = request.script += '\n onRequest(brunoRequest);';
        const scriptRuntime = new ScriptRuntime();
        scriptRuntime.run(request.script, request, environment);
      }

      mainWindow.webContents.send('main:http-request-sent', {
        requestSent: {
          url: request.url,
          method: request.method,
          headers: request.headers,
          data: request.data
        },
        collectionUid,
        itemUid: item.uid,
        cancelTokenUid
      });

      interpolateVars(request, environment);

      const result = await axios(request);

      deleteCancelToken(cancelTokenUid);

      return {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        data: result.data
      };
    } catch (error) {
      deleteCancelToken(cancelTokenUid);

      if(error.response) {
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        }
      };

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
