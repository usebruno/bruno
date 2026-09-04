const { createPropertyListBridge } = require('../../utils/property-list-bridge');

/**
 * Bridges a GrpcMessageList — `bru.grpc.request.messages`, `bru.grpc.response.messages`
 * — onto a VM object. Keep in sync with GrpcMessageList
 *
 * @param {Object} vm - QuickJS VM instance
 * @param {Object} list - The native GrpcMessageList
 * @param {Object} targetObject - VM object handle the list is attached to
 * @param {string} objectPath - Path to `targetObject` in the VM, e.g. `globalThis.bru.grpc.request`
 * @returns {string} Code the caller must eval once `objectPath` resolves
 */
const addGrpcMessageListShimToContext = (vm, list, targetObject, objectPath) => {
  const listObject = vm.newObject();

  const { evalCode } = createPropertyListBridge(vm, list, listObject, {
    globalPath: `${objectPath}.messages`,
    syncReadMethods: ['count'],
    syncReadObjectMethods: ['get', 'all', 'toJSON'],
    withIterators: true
  });

  vm.setProp(targetObject, 'messages', listObject);
  listObject.dispose();

  return evalCode;
};

module.exports = addGrpcMessageListShimToContext;
