import { REQUEST_TYPES } from 'utils/common/constants';

const SET_AS_VARIABLE_SUPPORT_BY_REQUEST_TYPE = Object.freeze({
  'http-request': true,
  'graphql-request': false,
  'grpc-request': false,
  'ws-request': false
});

export const supportsSetAsVariable = (item) =>
  REQUEST_TYPES.includes(item?.type) ? SET_AS_VARIABLE_SUPPORT_BY_REQUEST_TYPE[item.type] : true;
