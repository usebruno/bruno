const { createPropertyListBridge } = require('../../utils/property-list-bridge');

/**
 * Bridges a GrpcMetadataList — `bru.grpc.request.metadata`, `bru.grpc.response.metadata`,
 * `bru.grpc.response.trailers` — onto a VM object. Keep in sync with GrpcMetadataList
 *
 * @param {Object} vm - QuickJS VM instance
 * @param {Object} list - The native GrpcMetadataList
 * @param {Object} targetObject - VM object handle the list is attached to
 * @param {string} property - Property name on `targetObject`
 * @param {string} objectPath - Path to `targetObject` in the VM, e.g. `globalThis.bru.grpc.request`
 * @returns {string} Code the caller must eval once `objectPath` resolves
 */
const addGrpcMetadataListShimToContext = (vm, list, targetObject, property, objectPath) => {
  const listObject = vm.newObject();

  const { evalCode } = createPropertyListBridge(vm, list, listObject, {
    globalPath: `${objectPath}.${property}`,
    syncReadMethods: ['get', 'has', 'count', 'indexOf', 'toObject', 'toString'],
    syncReadObjectMethods: ['one', 'all', 'toJSON'],
    syncWriteMethods: ['upsert', 'add', 'remove', 'clear'],
    withIterators: true
  });

  vm.setProp(targetObject, property, listObject);
  listObject.dispose();

  return evalCode;
};

module.exports = addGrpcMetadataListShimToContext;
