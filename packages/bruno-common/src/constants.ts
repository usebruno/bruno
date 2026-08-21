/** Item `type` values (a request's kind). */
export type RequestType = 'http-request' | 'graphql-request' | 'grpc-request' | 'ws-request';

export const DEFAULT_HTTP_ITEM_SETTINGS = {
  encodeUrl: true,
  forwardAuthorizationHeader: false
};
