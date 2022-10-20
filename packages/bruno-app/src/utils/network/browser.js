const axios = require('axios');
import { saveCancelToken, deleteCancelToken } from 'utils/network/cancelTokens';

export const sendHttpRequestInBrowser = async (request, options) => {
  try {
    if (options && options.cancelTokenUid) {
      const cancelToken = axios.CancelToken.source();
      request.cancelToken = cancelToken.token;
      saveCancelToken(options.cancelTokenUid, cancelToken);
    }

    const result = await axios(request);

    if (options && options.cancelTokenUid) {
      deleteCancelToken(options.cancelTokenUid);
    }

    return {
      status: result.status,
      headers: result.headers,
      data: result.data
    };
  } catch (error) {
    if (options && options.cancelTokenUid) {
      deleteCancelToken(options.cancelTokenUid);
    }

    if (error.response) {
      return {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      };
    }

    return Promise.reject(error);
  }
};
