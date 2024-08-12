const axios = require('axios');
const ivm = require('isolated-vm');
const { cleanJson } = require('../../../../utils');

const addAxiosShimToContext = async (context) => {
  await context.evalClosure(
    `
        globalThis.axios = (...args) => $0.applySyncPromise(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.axios.get = (...args) => $1.applySyncPromise(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.axios.post = (...args) => $2.applySyncPromise(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.axios.put = (...args) => $3.applySyncPromise(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.axios.delete = (...args) => $4.applySyncPromise(undefined, args?.map(arg=>JSON.stringify(arg)));
        globalThis.axios.patch = (...args) => $5.applySyncPromise(undefined, args?.map(arg=>JSON.stringify(arg)));
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
            const { status, headers, data } = response || {};
            return cleanJson({ status, headers, data });
          })
          .catch((err) => {
            return {
              message: err.message
              // response: cleanJson(err.response)
            };
          });
        return new ivm.ExternalCopy(res).copyInto({ release: true });
      },
      async (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        const res = await axios
          .get(...args)
          .then((response) => {
            const { status, headers, data } = response || {};
            return cleanJson({ status, headers, data });
          })
          .catch((err) => {
            return {
              message: err.message
              // response: cleanJson(err.response)
            };
          });
        return new ivm.ExternalCopy(res).copyInto({ release: true });
      },
      async (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        const res = await axios
          .post(...args)
          .then((response) => {
            const { status, headers, data } = response || {};
            return cleanJson({ status, headers, data });
          })
          .catch((err) => {
            return {
              message: err.message
              // response: cleanJson(err.response)
            };
          });
        return new ivm.ExternalCopy(res).copyInto({ release: true });
      },
      async (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        const res = await axios
          .put(...args)
          .then((response) => {
            const { status, headers, data } = response || {};
            return cleanJson({ status, headers, data });
          })
          .catch((err) => {
            return {
              message: err.message
              // response: cleanJson(err.response)
            };
          });
        return new ivm.ExternalCopy(res).copyInto({ release: true });
      },
      async (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        const res = await axios
          .delete(...args)
          .then((response) => {
            const { status, headers, data } = response || {};
            return cleanJson({ status, headers, data });
          })
          .catch((err) => {
            return {
              message: err.message
              // response: cleanJson(err.response)
            };
          });
        return new ivm.ExternalCopy(res).copyInto({ release: true });
      },
      async (...argStrings) => {
        let args = argStrings?.map((arg) => JSON.parse(arg));
        const res = await axios
          .patch(...args)
          .then((response) => {
            const { status, headers, data } = response || {};
            return cleanJson({ status, headers, data });
          })
          .catch((err) => {
            return {
              message: err.message
              // response: cleanJson(err.response)
            };
          });
        return new ivm.ExternalCopy(res).copyInto({ release: true });
      }
    ],
    { arguments: { reference: true } }
  );
};

module.exports = addAxiosShimToContext;
