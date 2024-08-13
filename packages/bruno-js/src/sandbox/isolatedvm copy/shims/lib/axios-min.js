const axios = require('axios');
const ivm = require('isolated-vm');
const { cleanJson } = require('../../../../utils');

const addAxiosShimToContext = async (context) => {
  await context.evalClosure(
    `
        globalThis.axios = (...args) => $0.applySyncPromise(undefined, args?.map(arg=>JSON.stringify(arg)));
        ${['get', 'post', 'put', 'patch', 'delete']
          ?.map(
            (method, idx) =>
              `globalThis.axios.${method} = (...args) => $${
                idx + 1
              }.applySyncPromise(undefined, args?.map(arg=>JSON.stringify(arg)))`
          )
          .join('\n')}
        globalThis.requireObject = {
          ...globalThis.requireObject,
          axios: globalThis.axios,
        }
    `,
    [
      async (...argStrings) => {
        console.log(argStrings);
        let args = argStrings?.map((arg) => JSON.parse(arg));
        const res = await axios(...args)
          .then((response) => {
            return cleanJson(response?.data);
          })
          .catch((err) => {
            return {
              message: err.message
              // response: cleanJson(err.response)
            };
          });
        return new ivm.ExternalCopy(res).copyInto({ release: true });
      },
      ...['get', 'post', 'put', 'patch', 'delete']?.map((method) => async (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        const res = await axios[method](...args)
          .then((response) => {
            return cleanJson(response?.data);
          })
          .catch((err) => {
            return {
              message: err.message
              // response: cleanJson(err.response)
            };
          });
        return new ivm.ExternalCopy(res).copyInto({ release: true });
      })
    ],
    { arguments: { reference: true } }
  );
};

module.exports = addAxiosShimToContext;
