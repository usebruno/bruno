const { createCookieAgent, HttpCookieAgent, HttpsCookieAgent } = require('http-cookie-agent/http');

const { CookieJar } = require('tough-cookie');

const jar = new CookieJar();

/**
 * Get base agent configuration for Axios.
 * If the options enable cookies, then the base agents will enable cookies.
 * @param options
 * @return {{[httpAgent]: http.Agent, [httpsAgent]: https.Agent}}
 */
function getBaseAgents(options) {
  if (options.useCookies) {
    return getCookieAgents();
  } else {
    return {};
  }
}

/**
 * Wrap an existing agent class with an agent supporting the supported features
 * @param agentClass The class to wrap
 * @param arg Any first argument to the wrapped class constructor
 * @param options Any options to pass to the agent. This can also include `useCookies` to enable cookies.
 * @return {http.Agent} Wrapped agent
 */
function getWrappedAgent(agentClass, arg = null, options = {}) {
  const {useCookies, ...classOptions} = options;

  if (useCookies) {
    return getCookieEnabledAgent(agentClass, arg, options);
  } else {
    if (arg) {
      return new agentClass(arg, options);
    } else {
      return new agentClass(options);
    }
  }
}

/**
 * Get cookie enabled HTTP(s) Agents
 * @return {{httpAgent: http.Agent, httpsAgent: https.Agent}}
 */
function getCookieAgents() {
  return {
    httpAgent: new HttpCookieAgent({ cookies: { jar } }),
    httpsAgent: new HttpsCookieAgent({ cookies: { jar } }),
  }
}

/**
 *
 * @param {object} agentClass The agent class to wrap
 * @param {object} arg Any first (non-options) argument (e.g. proxy URL)
 * @param {object} options Any options to pass to the class
 * @return {http.Agent} wrapped object
 */
function getCookieEnabledAgent(agentClass, arg = null, options= {}) {
  const WrappedClass = createCookieAgent(agentClass);
  const combinedArgs = {
    ...options,
    cookies: { jar }
  };
  if (arg) {
    return new WrappedClass(arg, combinedArgs);
  } else {
    return new WrappedClass(combinedArgs);
  }
}


module.exports = {
  getBaseAgents,
  getWrappedAgent
}