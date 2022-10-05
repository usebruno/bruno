const axios = require('axios');
const FormData = require('form-data');
const { ipcMain } = require('electron');
const { forOwn, extend } = require('lodash');


const registerIpc = () => {
  // handler for sending http request
  ipcMain.handle('send-http-request', async (event, request) => {
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

      const result = await axios(request);

      return {
        status: result.status,
        headers: result.headers,
        data: result.data
      };
    } catch (error) {
      if(error.response) {
        return {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data
        };
      }

      return {
        status: -1,
        headers: [],
        data: null
      };
    }
  });
};

module.exports = registerIpc;
