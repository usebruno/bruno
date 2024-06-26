const ivm = require('isolated-vm');
const uuid = require('uuid');
const { MAX, NIL } = uuid;

const addUuidShimToContext = async (context) => {
  await context.evalClosure(
    `
        globalThis.uuid = {};
        globalThis.uuid.MAX = $0;
        globalThis.uuid.NIL = $1;
        ${['version', 'parse', 'stringify', 'v1', 'v1ToV6', 'v3', 'v4', 'v5', 'v6', 'v6ToV1', 'v7', 'validate']
          ?.map(
            (fn, idx) =>
              `globalThis.uuid.${fn} = (...args) => $${
                idx + 2
              }.applySync(undefined, args?.map(arg=>JSON.stringify(arg)));`
          )
          .join('\n')}
        globalThis.requireObject = {
            ...globalThis.requireObject,
            uuid: globalThis.uuid,
        }
    `,
    [
      new ivm.ExternalCopy(MAX).copyInto({ release: true }),
      new ivm.ExternalCopy(NIL).copyInto({ release: true }),
      ...['version', 'parse', 'stringify', 'v1', 'v1ToV6', 'v3', 'v4', 'v5', 'v6', 'v6ToV1', 'v7', 'validate']?.map(
        (fn) =>
          (...argStrings) => {
            let args = argStrings?.map((arg) => JSON.parse(arg));
            return new ivm.ExternalCopy(uuid[fn](...args)).copyInto({ release: true });
          }
      )
    ],
    { arguments: { reference: true } }
  );
};

module.exports = addUuidShimToContext;
