import classnames from 'classnames';
import React from 'react';
import StyledWrapper from './StyledWrapper';

const getMethodFlags = (item) => ({
  isGrpc: item.type === 'grpc-request',
  isWS: item.type === 'ws-request',
  isGraphQL: item.type === 'graphql-request'
});

const getMethodText = (item, { isGrpc, isWS, isGraphQL }) => {
  if (isGrpc) return 'grpc';
  if (isWS) return 'ws';
  if (isGraphQL) return 'gql';
  const method = item.request?.method || '';
  return method.length > 5
    ? method.substring(0, 3)
    : method;
};

const getClassname = (method = '', { isGrpc, isWS, isGraphQL }) => {
  method = method.toLocaleLowerCase();
  return classnames('mr-1', {
    'method-get': method === 'get',
    'method-post': method === 'post',
    'method-put': method === 'put',
    'method-delete': method === 'delete',
    'method-patch': method === 'patch',
    'method-head': method === 'head',
    'method-options': method === 'options',
    'method-grpc': isGrpc,
    'method-ws': isWS,
    'method-graphql': isGraphQL
  });
};

const RequestMethod = ({ item }) => {
  if (!['http-request', 'graphql-request', 'grpc-request', 'ws-request'].includes(item.type)) {
    return null;
  }

  const flags = getMethodFlags(item);
  const methodText = getMethodText(item, flags);
  // Use optional chaining to handle partial requests
  const className = getClassname(item.request?.method || '', flags);

  return (
    <StyledWrapper>
      <div className={className}>
        <span className="uppercase">
          {methodText}
        </span>
      </div>
    </StyledWrapper>
  );
};

export default RequestMethod;
