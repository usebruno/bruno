const ivm = require('isolated-vm');
const { nanoid } = require('nanoid');

const addNanoidShimToContext = async (context) => {
  await context.evalClosure(
    `
        globalThis.nanoid = {};
        globalThis.nanoid.nanoid = () => $0.applySync(undefined);
        globalThis.requireObject = {
            ...globalThis.requireObject,
            nanoid: globalThis.nanoid
        }
    `,
    [
      () => {
        return new ivm.ExternalCopy(nanoid()).copyInto({ release: true });
      }
    ],
    { arguments: { reference: true } }
  );
};

module.exports = addNanoidShimToContext;
