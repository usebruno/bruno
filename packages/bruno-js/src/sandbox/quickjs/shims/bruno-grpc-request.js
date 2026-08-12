const { marshallToVm } = require('../utils');
const addGrpcMetadataListShimToContext = require('./grpc-metadata-list');
const addGrpcMessageListShimToContext = require('./grpc-message-list');

// Keep this in step with BrunoGrpcRequest.
const addBrunoGrpcRequestShimToContext = (vm, req, grpcObject) => {
  const reqObject = vm.newObject();

  const scalars = ['url', 'method', 'methodType', 'authMode', 'protoPath', 'name'];

  for (const property of scalars) {
    const value = marshallToVm(req[property], vm);
    vm.setProp(reqObject, property, value);
    value.dispose();
  }

  // req.metadata — writable in `beforeCallStart`, read-only in `afterCallEnd`
  const metadataEvalCode = addGrpcMetadataListShimToContext(
    vm,
    req.metadata,
    reqObject,
    'metadata',
    'globalThis.bru.grpc.req'
  );

  // req.messages — writable in `beforeCallStart`, read-only in `afterCallEnd`
  const messagesEvalCode = addGrpcMessageListShimToContext(vm, req.messages, reqObject, 'globalThis.bru.grpc.req');

  vm.setProp(grpcObject, 'req', reqObject);
  reqObject.dispose();

  return { evalCode: [metadataEvalCode, messagesEvalCode] };
};

module.exports = addBrunoGrpcRequestShimToContext;
