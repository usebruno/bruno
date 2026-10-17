/**
 * Describes Bruno's script API for translation back to Postman — the mirror of
 * postman-registry.js, and read by the same engine.
 *
 * `bru.cookies.jar` appears alongside `pm.cookies.jar` because this pass may run against a
 * script that was already partly translated, which the pass it replaced also accepted.
 */
const BRUNO_REGISTRY = {
  producers: {
    'bru.sendRequest': 'BrunoResponse',
    'bru.cookies.jar': 'BrunoCookieJar',
    'pm.cookies.jar': 'BrunoCookieJar'
  },

  params: {
    'bru.sendRequest': {
      callback: [null, 'BrunoResponse']
    }
  },

  types: {
    // Bruno's axios-shaped response vs Postman's. `data` is already parsed on Bruno's but is
    // the `json()` method on Postman's, so it gains a call. `status` holds the code on Bruno's
    // and the status text on Postman's, which is why both members shift by one name.
    BrunoResponse: {
      data: { to: 'json', call: 'add' },
      status: { to: 'code' },
      statusText: { to: 'status' }
    },

    BrunoCookieJar: {
      getCookie: { to: 'get' },
      getCookies: { to: 'getAll' },
      setCookie: { to: 'set' },
      deleteCookie: { to: 'unset' },
      deleteCookies: { to: 'clear' }
    }
  }
};

export default BRUNO_REGISTRY;
