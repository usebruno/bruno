const { marshallToVm } = require('../utils');
const addGrpcMetadataListShimToContext = require('./grpc-metadata-list');
const addGrpcMessageListShimToContext = require('./grpc-message-list');

// Keep this in step with BrunoGrpcResponse.
const addBrunoGrpcResponseShimToContext = (vm, res, grpcObject) => {
  const resObject = vm.newObject();

  // Marshalled once, as on the request: the call is over, so no scalar can change mid-hook.
  const scalars = ['statusCode', 'statusMessage', 'duration', 'methodType'];

  for (const property of scalars) {
    const value = marshallToVm(res?.[property], vm);
    vm.setProp(resObject, property, value);
    value.dispose();
  }

  // res.metadata / res.trailers / res.messages — the same lists `bru.grpc.req` gets, read-only here
  const listEvalCode = ['metadata', 'trailers'].map((property) =>
    addGrpcMetadataListShimToContext(vm, res[property], resObject, property, 'globalThis.bru.grpc.res')
  );

  listEvalCode.push(addGrpcMessageListShimToContext(vm, res.messages, resObject, 'globalThis.bru.grpc.res'));

  vm.setProp(grpcObject, 'res', resObject);
  resObject.dispose();

  return { evalCode: listEvalCode };
};

module.exports = addBrunoGrpcResponseShimToContext;
