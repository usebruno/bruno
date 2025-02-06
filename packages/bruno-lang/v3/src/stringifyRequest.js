const yaml = require('js-yaml');
const _ = require('lodash');
const { getMeta, getParams, getHeaders, getVars, getScripts, getBody, getAuth, getTests, getDocs } = require('./common');

const stringifyRequest = (json) => {
  const request = json?.request;
  const requestBody = getBody(request);
  const requestAuth = getAuth(request);
  const isGraphql = requestBody?.type === 'graphql';

  const requestData = {
    method: _.lowerCase(_.get(json, 'request.method')),
    url: _.get(json, 'request.url'),
    params: getParams(request),
    headers: getHeaders(request),
  };

  if (requestBody && requestBody.type !== 'none') {
    requestData.body = requestBody;
  }

  if (requestAuth && requestAuth.mode !== 'none') {
    requestData.auth = requestAuth;
  }

  const finalJson = {
    meta: getMeta(json),
    [isGraphql ? 'graphql' : 'http']: requestData
  };

  const vars = getVars(request);
  if (vars) {
    finalJson.vars = vars;
  }

  const scripts = getScripts(request);
  if (scripts) {
    finalJson.scripts = scripts;
  }

  const tests = getTests(request);
  if (tests) {
    finalJson.tests = tests;
  }

  const docs = getDocs(request);
  if (docs) {
    finalJson.docs = docs;
  }

  return yaml.dump(finalJson);
};

module.exports = stringifyRequest; 