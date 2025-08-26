import classnames from 'classnames';
import React from 'react';
import StyledWrapper from './StyledWrapper';


const getMethodFlags = (item) => ({
  isGrpc: item.type === 'grpc-request',
  isWS: item.type === 'ws-request'
});

const getMethodText = (item, { isGrpc, isWS }) =>
  isGrpc
    ? 'grpc'
    : isWS
    ? 'ws'
    : item.request.method.length > 5
    ? item.request.method.substring(0, 3)
    : item.request.method;

const getClassname = (method = '', { isGrpc, isWS }) => {
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
    'method-ws': isWS
  });
};


const RequestMethod = ({ item }) => {
  if (!['http-request', 'graphql-request', 'grpc-request', 'ws-request'].includes(item.type)) {
    return null;
  }

  const flags = getMethodFlags(item);
  const methodText = getMethodText(item, flags);
  const className = getClassname(item.request.method, flags);

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
