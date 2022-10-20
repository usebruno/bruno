import each from "lodash/each";
import filter from "lodash/filter";
import qs from "qs";
import { rawRequest, gql } from "graphql";
import { sendHttpRequestInBrowser } from "./browser";
import { isElectron } from "utils/common/platform";
import cancelTokens, { deleteCancelToken } from "utils/network/cancelTokens";

export const sendNetworkRequest = async (item, options) => {
  return new Promise((resolve, reject) => {
    if (item.type === "http-request") {
      const timeStart = Date.now();
      sendHttpRequest(item.draft ? item.draft.request : item.request, options)
        .then((response) => {
          const timeEnd = Date.now();
          resolve({
            state: "success",
            data: response.data,
            headers: Object.entries(response.headers),
            size: response.headers["content-length"] || 0,
            status: response.status,
            duration: timeEnd - timeStart,
          });
        })
        .catch((err) => reject(err));
    }
  });
};

const sendHttpRequest = async (request, options) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    const headers = {};
    each(request.headers, (h) => {
      if (h.enabled) {
        headers[h.name] = h.value;
      }
    });

    let axiosRequest = {
      method: request.method,
      url: request.url,
      headers: headers,
    };

    if (request.body.mode === "json") {
      axiosRequest.headers["content-type"] = "application/json";
      try {
        axiosRequest.data = JSON.parse(request.body.json);
      } catch (ex) {
        axiosRequest.data = request.body.json;
      }
    }

    if (request.body.mode === "text") {
      axiosRequest.headers["content-type"] = "text/plain";
      axiosRequest.data = request.body.text;
    }

    if (request.body.mode === "xml") {
      axiosRequest.headers["content-type"] = "text/xml";
      axiosRequest.data = request.body.xml;
    }

    if (request.body.mode === "formUrlEncoded") {
      axiosRequest.headers["content-type"] = "application/x-www-form-urlencoded";
      const params = {};
      const enabledParams = filter(request.body.formUrlEncoded, (p) => p.enabled);
      each(enabledParams, (p) => (params[p.name] = p.value));
      axiosRequest.data = qs.stringify(params);
    }

    if (request.body.mode === "multipartForm") {
      const params = {};
      const enabledParams = filter(request.body.multipartForm, (p) => p.enabled);
      each(enabledParams, (p) => (params[p.name] = p.value));
      axiosRequest.headers["content-type"] = "multipart/form-data";
      axiosRequest.data = params;
    }

    console.log(">>> Sending Request");
    console.log(axiosRequest);

    if (isElectron()) {
      ipcRenderer.invoke("send-http-request", axiosRequest, options).then(resolve).catch(reject);
    } else {
      sendHttpRequestInBrowser(axiosRequest, options).then(resolve).catch(reject);
    }
  });
};

const sendGraphqlRequest = async (request) => {
  const query = gql`
    ${request.request.body.graphql.query}
  `;

  const { data, errors, extensions, headers, status } = await rawRequest(request.request.url, query);

  return {
    data,
    headers,
    data,
    errors,
  };
};

export const cancelNetworkRequest = async (cancelTokenUid) => {
  if (isElectron()) {
    return new Promise((resolve, reject) => {
      ipcRenderer.invoke("cancel-http-request", cancelTokenUid).then(resolve).catch(reject);
    });
  }

  return new Promise((resolve, reject) => {
    if (cancelTokenUid && cancelTokens[cancelTokenUid]) {
      cancelTokens[cancelTokenUid].cancel();
      deleteCancelToken(cancelTokenUid);
      resolve();
    } else {
      reject(new Error("cancel token not found"));
    }
  });
};
