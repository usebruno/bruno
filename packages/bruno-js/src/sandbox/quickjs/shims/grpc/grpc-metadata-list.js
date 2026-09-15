const { createPropertyListBridge } = require('../../utils/property-list-bridge');
const { bridgeMethodSets } = require('../../../../property-lists/manifest');

/**
 * Bridges a gRPC metadata list — `bru.grpc.request.metadata`, `bru.grpc.response.metadata`,
 * `bru.grpc.response.trailers` — onto a VM object. Method sets derive from the
 * property-list manifest, so the shim tracks the native surface automatically.
 *
 * @param {Object} vm - QuickJS VM instance
 * @param {Object} list - The native metadata PropertyList
 * @param {Object} targetObject - VM object handle the list is attached to
 * @param {string} property - Property name on `targetObject`
 * @param {string} objectPath - Path to `targetObject` in the VM, e.g. `globalThis.bru.grpc.request`
 * @returns {string} Code the caller must eval once `objectPath` resolves
 */
const addGrpcMetadataListShimToContext = (vm, list, targetObject, property, objectPath) => {
  const listObject = vm.newObject();
  const globalPath = `${objectPath}.${property}`;

  const { evalCode } = createPropertyListBridge(vm, list, listObject, {
    globalPath,
    ...bridgeMethodSets(globalPath.replace('globalThis.', ''))
  });

  vm.setProp(targetObject, property, listObject);
  listObject.dispose();

  return evalCode;
};

module.exports = addGrpcMetadataListShimToContext;
