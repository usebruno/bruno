const { marshallToVm } = require('../../utils');
const addGrpcMetadataListShimToContext = require('./grpc-metadata-list');
const addGrpcMessageListShimToContext = require('./grpc-message-list');

// Keep this in step with BrunoGrpcResponse.
const addBrunoGrpcResponseShimToContext = (vm, response, grpcObject) => {
  const responseObject = vm.newObject();

  // Marshalled once, as on the request: the call is over, so no scalar can change mid-hook.
  const scalars = ['statusCode', 'statusText', 'duration'];

  for (const property of scalars) {
    const value = marshallToVm(response?.[property], vm);
    vm.setProp(responseObject, property, value);
    value.dispose();
  }

  // response.metadata / .trailers / .messages — the same lists `bru.grpc.request` gets, read-only here
  const listEvalCode = ['metadata', 'trailers'].map((property) =>
    addGrpcMetadataListShimToContext(vm, response[property], responseObject, property, 'globalThis.bru.grpc.response')
  );

  listEvalCode.push(
    addGrpcMessageListShimToContext(vm, response.messages, responseObject, 'globalThis.bru.grpc.response')
  );

  // response.message — present only in `afterMessageReceive`
  if (response.message) {
    const message = marshallToVm(response.message, vm);
    vm.setProp(responseObject, 'message', message);
    message.dispose();
  }

  vm.setProp(grpcObject, 'response', responseObject);
  responseObject.dispose();

  return { evalCode: listEvalCode };
};

module.exports = addBrunoGrpcResponseShimToContext;
