const ivm = require('isolated-vm');
const { MAX, NIL, parse, stringify, v1, v1ToV6, v3, v4, v5, v6, v6ToV1, v7, validate, version } = require('uuid');

const addUuidShimToContext = async (context) => {
  await context.evalClosure(
    `
        globalThis.uuid = {};
        globalThis.uuid.MAX = $0;
        globalThis.uuid.NIL = $1;
        globalThis.uuid.version = (...args) => $2.applySync(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.uuid.parse = (...args) => $3.applySync(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.uuid.stringify = (...args) => $4.applySync(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.uuid.v1 = (...args) => $5.applySync(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.uuid.v1ToV6 = (...args) => $6.applySync(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.uuid.v3 = (...args) => $7.applySync(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.uuid.v4 = (...args) => $8.applySync(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.uuid.v5 = (...args) => $9.applySync(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.uuid.v6 = (...args) => $10.applySync(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.uuid.v6ToV1 = (...args) => $11.applySync(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.uuid.v7 = (...args) => $12.applySync(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.uuid.validate = (...args) => $13.applySync(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.requireObject = {
            ...globalThis.requireObject,
            uuid: globalThis.uuid,
        }
    `,
    [
      new ivm.ExternalCopy(MAX).copyInto({ release: true }),
      new ivm.ExternalCopy(NIL).copyInto({ release: true }),
      (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        return new ivm.ExternalCopy(version(...args)).copyInto({ release: true });
      },
      (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        return new ivm.ExternalCopy(parse(...args)).copyInto({ release: true });
      },
      (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        return new ivm.ExternalCopy(stringify(...args)).copyInto({ release: true });
      },
      (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        return new ivm.ExternalCopy(v1(...args)).copyInto({ release: true });
      },
      (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        return new ivm.ExternalCopy(v1ToV6(...args)).copyInto({ release: true });
      },
      (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        return new ivm.ExternalCopy(v3(...args)).copyInto({ release: true });
      },
      (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        return new ivm.ExternalCopy(v4(...args)).copyInto({ release: true });
      },
      (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        return new ivm.ExternalCopy(v5(...args)).copyInto({ release: true });
      },
      (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        return new ivm.ExternalCopy(v6(...args)).copyInto({ release: true });
      },
      (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        return new ivm.ExternalCopy(v6ToV1(...args)).copyInto({ release: true });
      },
      (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        return new ivm.ExternalCopy(v7(...args)).copyInto({ release: true });
      },
      (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        return new ivm.ExternalCopy(validate(...args)).copyInto({ release: true });
      }
    ],
    { arguments: { reference: true } }
  );
};

module.exports = addUuidShimToContext;
