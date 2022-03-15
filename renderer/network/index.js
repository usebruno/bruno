import actions from '../providers/Store/actions';
import { rawRequest, gql } from 'graphql-request';

const sendRequest = async (item, collectionUid, dispatch) => {
  if(item.type === 'http-request') {
    dispatch({
      type: actions.SENDING_REQUEST,
      collectionUid: collectionUid,
      itemUid: item.uid
    });

    const timeStart = Date.now();
    sendHttpRequest(item.request)
      .then((response) => {
        console.log(response);
        const timeEnd = Date.now();
        dispatch({
          type: actions.RESPONSE_RECEIVED,
          response: {
            state: 'success',
            data: response.data,
            headers: Object.entries(response.headers),
            size: response.headers["content-length"],
            status: response.status,
            duration: timeEnd - timeStart
          },
          collectionUid: collectionUid,
          itemUid: item.uid
        });
      })
      .catch((err) => console.error(err));
  }
};

const sendHttpRequest = async (request) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window.require("electron");

    console.log(request);

    let options = {
      method: request.method,
      url: request.url,
    };

    ipcRenderer
      .invoke('send-http-request', options)
      .then(resolve)
      .catch(reject);
  });
};

const sendGraphqlRequest = async (request, collectionId, dispatch) => {
  dispatch({
    type: actions.SENDING_REQUEST,
    request: request,
    collectionId: collectionId
  });

  const query = gql`${request.request.body.graphql.query}`;

  const timeStart = Date.now();
  const { data, errors, extensions, headers, status } = await rawRequest(request.request.url, query);
  const timeEnd = Date.now();

  if(data && !errors) {
    // todo: alternate way to calculate length when content length is not present
    const size = headers.map["content-length"];

    dispatch({
      type: actions.RESPONSE_RECEIVED,
      response: {
        data: data,
        headers: Object.entries(headers.map),
        size: size,
        status: status,
        duration: timeEnd - timeStart
      },
      request: request,
      collectionId: collectionId
    });
  }
};

export {
  sendRequest,
  sendGraphqlRequest
};
