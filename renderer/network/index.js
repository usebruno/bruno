import actions from '../providers/Store/actions';
import { rawRequest, gql } from 'graphql-request';

const sendRequest = async (request, collectionId, dispatch) => {
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
  sendRequest
};
