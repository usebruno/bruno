const { marshallToVm } = require('../../utils');
const addGrpcMetadataListShimToContext = require('./grpc-metadata-list');
const addGrpcMessageListShimToContext = require('./grpc-message-list');

// Keep this in step with BrunoGrpcRequest.
const addBrunoGrpcRequestShimToContext = (vm, request, grpcObject) => {
  const requestObject = vm.newObject();

  const scalars = ['url', 'method', 'methodType', 'authMode', 'protoPath', 'name'];

  for (const property of scalars) {
    const value = marshallToVm(request[property], vm);
    vm.setProp(requestObject, property, value);
    value.dispose();
  }

  // request.metadata — writable in `beforeCallStart`, read-only in `afterCallEnd`
  const metadataEvalCode = addGrpcMetadataListShimToContext(
    vm,
    request.metadata,
    requestObject,
    'metadata',
    'globalThis.bru.grpc.request'
  );

  // request.messages — the messages the call sent, read-only, and empty until it has sent any
  const messagesEvalCode = addGrpcMessageListShimToContext(
    vm,
    request.messages,
    requestObject,
    'globalThis.bru.grpc.request'
  );

  // request.message — present only in `beforeMessageSend`.
  if (request.message) {
    const message = marshallToVm(request.message, vm);
    vm.setProp(requestObject, 'message', message);
    message.dispose();
  }

  vm.setProp(grpcObject, 'request', requestObject);
  requestObject.dispose();

  return { evalCode: [metadataEvalCode, messagesEvalCode] };
};

module.exports = addBrunoGrpcRequestShimToContext;
