const axios = require('axios');
const { ipcMain } = require('electron');

const registerIpc = () => {
  // handler for sending http request
  ipcMain.handle('send-http-request', async (event, request) => {
    try {
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
