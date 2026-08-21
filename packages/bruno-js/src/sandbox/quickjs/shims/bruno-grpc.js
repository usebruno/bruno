const { marshallToVm } = require('../utils');

/**
 * Marshals the phase-aware `bru.grpc` namespace into the QuickJS sandbox.
 *
 * Methods are discovered by reflection (not hand-listed), so adding a method to any class in
 * grpc-script-api.js automatically surfaces it in the sandbox — no edits here.
 */

// Iterators take a JS function argument, which can't cross the native↔VM boundary (vm.dump can't
// serialize functions). They're rebuilt in-VM over `all()` instead; everything else is bridged natively.
const IN_VM_ITERATORS = new Set(['find', 'filter', 'map', 'each']);

/**
 * Discover an API object's public method names: own props (grpc lists attach their methods as own
 * props via `expose()`) plus a custom prototype. Skips `constructor`, `_`-prefixed internals, and
 * the built-in Object/Array prototypes.
 */
const methodNames = (obj) => {
  const names = new Set();
  const collect = (source) => {
    for (const key of Object.getOwnPropertyNames(source)) {
      if (key === 'constructor' || key.startsWith('_')) continue;
      if (typeof obj[key] === 'function') names.add(key);
    }
  };
  collect(obj);
  const proto = Object.getPrototypeOf(obj);
  if (proto && proto !== Object.prototype && proto !== Array.prototype) {
    collect(proto);
  }
  return [...names];
};

// An API object (list/message) exposes methods; a namespace (grpc/request/response) is a plain
// object with none, whose children we recurse into.
const isApiObject = (value) => value !== null && typeof value === 'object' && methodNames(value).length > 0;

// In-VM redefinition of the function-taking iterators, matching host semantics: `all()` returns an
// array (messages) → `(item)`, or a `{ key: value }` map (metadata/trailers) → `(value, key)` with
// find/filter yielding `{ key, value }`.
const buildIteratorEvalCode = (path, iterators) => {
  const p = `globalThis.${path}`;
  const defs = [];
  if (iterators.includes('each')) {
    defs.push(`${p}.each = (fn) => { const d = ${p}.all(); Array.isArray(d) ? d.forEach(fn) : Object.entries(d).forEach(([k, v]) => fn(v, k)); };`);
  }
  if (iterators.includes('map')) {
    defs.push(`${p}.map = (fn) => { const d = ${p}.all(); return Array.isArray(d) ? d.map(fn) : Object.entries(d).map(([k, v]) => fn(v, k)); };`);
  }
  if (iterators.includes('filter')) {
    defs.push(`${p}.filter = (fn) => { const d = ${p}.all(); return Array.isArray(d) ? d.filter(fn) : Object.entries(d).filter(([k, v]) => fn(v, k)).map(([k, v]) => ({ key: k, value: v })); };`);
  }
  if (iterators.includes('find')) {
    defs.push(`${p}.find = (fn) => { const d = ${p}.all(); if (Array.isArray(d)) return d.find(fn); const e = Object.entries(d).find(([k, v]) => fn(v, k)); return e ? { key: e[0], value: e[1] } : undefined; };`);
  }
  return defs.join('\n');
};

// Wire an API object's methods onto a VM object: native bridges for regular methods, queued in-VM
// definitions for the iterators.
const attachApiObject = (vm, hostObj, targetObj, path, iteratorEvalCodes) => {
  const names = methodNames(hostObj);
  for (const name of names) {
    if (IN_VM_ITERATORS.has(name)) continue;
    const fn = vm.newFunction(name, (...vmArgs) => {
      const args = vmArgs.map((a) => vm.dump(a));
      const result = hostObj[name](...args);
      // marshallToVm has no Date case (would become `{}`); expose it as an ISO string.
      return marshallToVm(result instanceof Date ? result.toISOString() : result, vm);
    });
    fn.consume((handle) => vm.setProp(targetObj, name, handle));
  }
  const iterators = names.filter((name) => IN_VM_ITERATORS.has(name));
  if (iterators.length) {
    iteratorEvalCodes.push(buildIteratorEvalCode(path, iterators));
  }
};

// Recursively marshal a `bru.grpc` node: scalar → value, API object → method bridge, namespace → recurse.
const marshallGrpcNode = (vm, node, path, iteratorEvalCodes) => {
  if (node === null || typeof node !== 'object') {
    return marshallToVm(node, vm);
  }
  if (isApiObject(node)) {
    // List-like (has `all()`): base the VM value on the underlying data (array/map) so it logs and
    // serializes as data — mirroring host `expose()`. Message-like: a plain object of methods.
    const base = typeof node.all === 'function' ? marshallToVm(node.all(), vm) : vm.newObject();
    attachApiObject(vm, node, base, path, iteratorEvalCodes);
    return base;
  }

  const obj = vm.newObject();
  for (const key of Object.keys(node)) {
    const child = marshallGrpcNode(vm, node[key], `${path}.${key}`, iteratorEvalCodes);
    vm.setProp(obj, key, child);
    child.dispose();
  }
  return obj;
};

// Attaches `bru.grpc` onto the already-global `bru` object.
const addBrunoGrpcShimToContext = (vm, grpc) => {
  const iteratorEvalCodes = [];
  const grpcHandle = marshallGrpcNode(vm, grpc, 'bru.grpc', iteratorEvalCodes);

  const bruHandle = vm.getProp(vm.global, 'bru');
  vm.setProp(bruHandle, 'grpc', grpcHandle);
  bruHandle.dispose();
  grpcHandle.dispose();

  if (iteratorEvalCodes.length) {
    vm.evalCode(`{ ${iteratorEvalCodes.join('\n')} }`);
  }
};

module.exports = addBrunoGrpcShimToContext;
