/**
 * Describes Postman's script API as types rather than as flat call paths: which calls
 * produce a typed value, which handler parameters receive one, and how each type's
 * members map onto Bruno's equivalent.
 *
 * The flat `simpleTranslations` map in postman-to-bruno-translator.js still owns everything
 * reachable by a fixed dotted path (`pm.environment.get`). This registry owns what that map
 * cannot express: values that flow through a binding, where the correct translation depends
 * on what the binding holds rather than on how it is spelled.
 *
 * Member spec:
 *   to      - the Bruno member name
 *   call    - 'drop' when the Postman member is a method but Bruno's is a plain property,
 *             so the call loses its parentheses (`res.json()` -> `res.data`)
 */
const POSTMAN_REGISTRY = {
  // Call path -> type of the value the call returns
  producers: {
    'pm.sendRequest': 'PostmanResponse',
    // `pm.cookies.jar` may already read as `bru.cookies.jar` when a script was partly
    // translated, which the pass this replaced also accepted.
    'pm.cookies.jar': 'PostmanCookieJar',
    'bru.cookies.jar': 'PostmanCookieJar'
  },

  // Call path -> types bound to the parameters of the functions it is handed.
  // `callback` is the node-style `(err, res)` argument, `then` a promise-chain handler.
  params: {
    'pm.sendRequest': {
      callback: [null, 'PostmanResponse'],
      then: ['PostmanResponse']
    }
  },

  types: {
    // Postman's response object vs Bruno's axios-shaped one. json()/text() are methods on
    // the Postman response but already-parsed properties on Bruno's.
    PostmanResponse: {
      code: { to: 'status' },
      status: { to: 'statusText' },
      json: { to: 'data', call: 'drop' },
      text: { to: 'data', call: 'drop' }
    },

    PostmanCookieJar: {
      get: { to: 'getCookie' },
      getAll: { to: 'getCookies' },
      set: { to: 'setCookie' },
      unset: { to: 'deleteCookie' },
      clear: { to: 'deleteCookies' }
    }
  }
};

export default POSTMAN_REGISTRY;
