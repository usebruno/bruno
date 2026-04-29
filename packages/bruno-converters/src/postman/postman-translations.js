import translateCode from '../utils/postman-to-bruno-translator';

// TODO: Restore the commented-out translations once the UI update fixes are live.
// Currently these APIs only work within the request lifecycle but fail to update the UI tables.
// e.g., setCollectionVar only sets the variable in the request lifecycle, fails to update the table in the UI.
const replacements = {
  // Environment variables
  'pm\\.environment\\.get\\(': 'bru.environment.get(',
  'pm\\.environment\\.set\\(': 'bru.environment.set(',
  'pm\\.environment\\.has\\(': 'bru.environment.has(',
  'pm\\.environment\\.unset\\(': 'bru.environment.unset(',
  'pm\\.environment\\.replaceIn\\(': 'bru.interpolate(',
  'pm\\.environment\\.toObject\\(': 'bru.environment.toObject(',
  'pm\\.environment\\.clear\\(': 'bru.environment.clear(',
  'pm\\.environment\\.name': 'bru.environment.name',

  // Runtime variables
  'pm\\.variables\\.get\\(': 'bru.variables.get(',
  'pm\\.variables\\.set\\(': 'bru.variables.set(',
  'pm\\.variables\\.has\\(': 'bru.variables.has(',
  'pm\\.variables\\.unset\\(': 'bru.variables.unset(',
  'pm\\.variables\\.replaceIn\\(': 'bru.interpolate(',
  'pm\\.variables\\.toObject\\(': 'bru.variables.toObject(',
  'pm\\.variables\\.clear\\(': 'bru.variables.clear(',

  // Global variables
  'pm\\.globals\\.get\\(': 'bru.globals.get(',
  'pm\\.globals\\.set\\(': 'bru.globals.set(',
  'pm\\.globals\\.has\\(': 'bru.globals.has(',
  // 'pm\\.globals\\.unset\\(': 'bru.globals.unset(',  // TODO: Re-enable once UI sync issue is resolved
  'pm\\.globals\\.replaceIn\\(': 'bru.interpolate(',
  'pm\\.globals\\.toObject\\(': 'bru.globals.toObject(',
  // 'pm\\.globals\\.clear\\(': 'bru.globals.clear(',  // TODO: Re-enable once UI sync issue is resolved

  // Collection variables
  'pm\\.collectionVariables\\.get\\(': 'bru.getCollectionVar(',
  // 'pm\\.collectionVariables\\.set\\(': 'bru.setCollectionVar(',
  'pm\\.collectionVariables\\.has\\(': 'bru.hasCollectionVar(',
  // 'pm\\.collectionVariables\\.unset\\(': 'bru.deleteCollectionVar(',
  // 'pm\\.collectionVariables\\.clear\\(': 'bru.deleteAllCollectionVars(',
  // 'pm\\.collectionVariables\\.toObject\\(': 'bru.getAllCollectionVars(',
  'pm\\.setNextRequest\\(': 'bru.setNextRequest(',
  'pm\\.test\\(': 'test(',
  'pm.response.to.have\\.status\\(': 'expect(res.getStatus()).to.equal(',
  'pm\\.response\\.to\\.have\\.status\\(': 'expect(res.getStatus()).to.equal(',
  'pm\\.response\\.json\\(': 'res.getBody(',
  'pm\\.expect\\(': 'expect(',
  'pm\\.response\\.code': 'res.getStatus()',
  'pm\\.response\\.text\\(\\)': 'JSON.stringify(res.getBody())',
  'pm\\.expect\\.fail\\(': 'expect.fail(',
  'pm\\.response\\.responseTime': 'res.getResponseTime()',
  'pm\\.globals\\.set\\(': 'bru.setGlobalEnvVar(',
  'pm\\.globals\\.get\\(': 'bru.getGlobalEnvVar(',
  // 'pm\\.globals\\.unset\\(': 'bru.deleteGlobalEnvVar(',
  'pm\\.globals\\.toObject\\(': 'bru.getAllGlobalEnvVars(',
  // 'pm\\.globals\\.clear\\(': 'bru.deleteAllGlobalEnvVars(',
  'pm\\.environment\\.toObject\\(': 'bru.getAllEnvVars(',
  'pm\\.environment\\.clear\\(': 'bru.deleteAllEnvVars(',
  'pm\\.variables\\.toObject\\(': 'bru.getAllVars(',
  // Request header PropertyList methods
  'pm\\.request\\.headers\\.remove\\(': 'req.deleteHeader(',
  'pm\\.request\\.headers\\.get\\(': 'req.headerList.get(',
  'pm\\.request\\.headers\\.has\\(': 'req.headerList.has(',
  'pm\\.request\\.headers\\.one\\(': 'req.headerList.one(',
  'pm\\.request\\.headers\\.all\\(': 'req.headerList.all(',
  'pm\\.request\\.headers\\.count\\(': 'req.headerList.count(',
  'pm\\.request\\.headers\\.indexOf\\(': 'req.headerList.indexOf(',
  'pm\\.request\\.headers\\.find\\(': 'req.headerList.find(',
  'pm\\.request\\.headers\\.filter\\(': 'req.headerList.filter(',
  'pm\\.request\\.headers\\.each\\(': 'req.headerList.each(',
  'pm\\.request\\.headers\\.map\\(': 'req.headerList.map(',
  'pm\\.request\\.headers\\.reduce\\(': 'req.headerList.reduce(',
  'pm\\.request\\.headers\\.toObject\\(': 'req.headerList.toObject(',
  'pm\\.request\\.headers\\.clear\\(': 'req.headerList.clear(',
  'pm\\.request\\.headers\\.add\\(': 'req.headerList.add(',
  'pm\\.request\\.headers\\.upsert\\(': 'req.headerList.upsert(',
  'pm\\.request\\.headers\\.toString\\(': 'req.headerList.toString(',
  'pm\\.request\\.headers\\.toJSON\\(': 'req.headerList.toJSON(',
  'pm\\.request\\.headers\\.populate\\(': 'req.headerList.populate(',
  'pm\\.request\\.headers\\.repopulate\\(': 'req.headerList.repopulate(',
  'pm\\.request\\.headers\\.assimilate\\(': 'req.headerList.assimilate(',
  // Lossy: positional inserts map to add (position irrelevant for headers)
  // Note: regex can't drop the second arg, so it passes through as-is
  'pm\\.request\\.headers\\.prepend\\(': 'req.headerList.add(',
  'pm\\.request\\.headers\\.insert\\(': 'req.headerList.add(',
  'pm\\.request\\.headers\\.insertAfter\\(': 'req.headerList.add(',
  // Response header PropertyList methods
  'pm\\.response\\.headers\\.get\\(': 'res.getHeader(',
  'pm\\.response\\.headers\\.has\\(': 'res.headerList.has(',
  'pm\\.response\\.headers\\.one\\(': 'res.headerList.one(',
  'pm\\.response\\.headers\\.all\\(': 'res.headerList.all(',
  'pm\\.response\\.headers\\.count\\(': 'res.headerList.count(',
  'pm\\.response\\.headers\\.indexOf\\(': 'res.headerList.indexOf(',
  'pm\\.response\\.headers\\.find\\(': 'res.headerList.find(',
  'pm\\.response\\.headers\\.filter\\(': 'res.headerList.filter(',
  'pm\\.response\\.headers\\.each\\(': 'res.headerList.each(',
  'pm\\.response\\.headers\\.map\\(': 'res.headerList.map(',
  'pm\\.response\\.headers\\.reduce\\(': 'res.headerList.reduce(',
  'pm\\.response\\.headers\\.toObject\\(': 'res.headerList.toObject(',
  'pm\\.response\\.headers\\.toString\\(': 'res.headerList.toString(',
  'pm\\.response\\.headers\\.toJSON\\(': 'res.headerList.toJSON(',
  'pm\\.response\\.to\\.have\\.jsonSchema\\(': 'expect(res.getBody()).to.have.jsonSchema(',
  'pm\\.response\\.to\\.not\\.have\\.jsonSchema\\(': 'expect(res.getBody()).to.not.have.jsonSchema(',
  'pm\\.response\\.not\\.to\\.have\\.jsonSchema\\(': 'expect(res.getBody()).not.to.have.jsonSchema(',
  'pm\\.response\\.to\\.have\\.not\\.jsonSchema\\(': 'expect(res.getBody()).to.have.not.jsonSchema(',
  'pm\\.response\\.to\\.have\\.jsonBody\\(': 'expect(res.getBody()).to.have.jsonBody(',
  'pm\\.response\\.to\\.not\\.have\\.jsonBody\\(': 'expect(res.getBody()).to.not.have.jsonBody(',
  'pm\\.response\\.not\\.to\\.have\\.jsonBody\\(': 'expect(res.getBody()).not.to.have.jsonBody(',
  'pm\\.response\\.to\\.have\\.not\\.jsonBody\\(': 'expect(res.getBody()).to.have.not.jsonBody(',
  'pm\\.response\\.to\\.have\\.body\\(': 'expect(res.getBody()).to.equal(',
  'pm\\.response\\.to\\.have\\.header\\(': 'expect(res.getHeaders()).to.have.property(',
  'pm\\.response\\.size\\(\\)': 'res.getSize()',
  'pm\\.response\\.size\\(\\)\\.body': 'res.getSize().body',
  'pm\\.response\\.responseSize': 'res.getSize().body',
  'pm\\.response\\.size\\(\\)\\.header': 'res.getSize().header',
  'pm\\.response\\.size\\(\\)\\.total': 'res.getSize().total',
  'pm\\.response\\.status': 'res.statusText',
  'pm\\.response\\.headers': 'res.getHeaders()',
  'tests\\[\'([^\']+)\'\\]\\s*=\\s*([^;]+);': 'test("$1", function() { expect(Boolean($2)).to.be.true; });',

  // Supported Postman request translations:
  // - pm.request.url / request.url     -> req.getUrl()
  // - pm.request.url.getHost() -> req.getHost()
  // - pm.request.url.getPath() -> req.getPath()
  // - pm.request.url.getQueryString() -> req.getQueryString()
  // - pm.request.url.variables -> req.getPathParams()
  // - pm.request.method / request.method -> req.getMethod()
  // - pm.request.headers / request.headers -> req.getHeaders()
  // - pm.request.body / request.body   -> req.getBody()
  // - pm.info.requestName / request.name -> req.getName()
  'pm\\.request\\.url\\.getHost\\(\\)': 'req.getHost()',
  'pm\\.request\\.url\\.getPath\\(\\)': 'req.getPath()',
  'pm\\.request\\.url\\.getQueryString\\(\\)': 'req.getQueryString()',
  'pm\\.request\\.url\\.variables': 'req.getPathParams()',
  'pm\\.request\\.url': 'req.getUrl()',
  'pm\\.request\\.method': 'req.getMethod()',
  'pm\\.request\\.headers': 'req.getHeaders()',
  'pm\\.request\\.body': 'req.getBody()',
  'pm\\.info\\.requestName': 'req.getName()',
  'request\\.url': 'req.getUrl()',
  'request\\.method': 'req.getMethod()',
  'request\\.headers': 'req.getHeaders()',
  'request\\.body': 'req.getBody()',
  'request\\.name': 'req.getName()',
  // deprecated translations
  'postman\\.setEnvironmentVariable\\(': 'bru.environment.set(',
  'postman\\.getEnvironmentVariable\\(': 'bru.environment.get(',
  'postman\\.clearEnvironmentVariable\\(': 'bru.environment.unset(',
  'pm\\.execution\\.skipRequest\\(\\)': 'bru.runner.skipRequest()',
  'pm\\.execution\\.skipRequest': 'bru.runner.skipRequest',
  'pm\\.execution\\.setNextRequest\\(null\\)': 'bru.runner.stopExecution()',
  'pm\\.execution\\.setNextRequest\\(\'null\'\\)': 'bru.runner.stopExecution()',
  // Cookie jar translations — order matters:
  // 1. Specific jar method patterns must come before the general jar() pattern,
  //    otherwise jar() consumes the prefix and the method patterns never match.
  // 2. All jar patterns must precede the simpler pm.cookies.* patterns below,
  //    since replacements are applied in insertion order.
  'pm\\.cookies\\.jar\\(\\)\\.get\\(': 'bru.cookies.jar().getCookie(',
  'pm\\.cookies\\.jar\\(\\)\\.set\\(': 'bru.cookies.jar().setCookie(',
  'pm\\.cookies\\.jar\\(\\)\\.unset\\(': 'bru.cookies.jar().deleteCookie(',
  'pm\\.cookies\\.jar\\(\\)\\.clear\\(': 'bru.cookies.jar().deleteCookies(',
  'pm\\.cookies\\.jar\\(\\)\\.getAll\\(': 'bru.cookies.jar().getCookies(',
  'pm\\.cookies\\.jar\\(\\)': 'bru.cookies.jar()',
  // Direct cookie access
  'pm\\.cookies\\.get\\(': 'bru.cookies.get(',
  'pm\\.cookies\\.has\\(': 'bru.cookies.has(',
  'pm\\.cookies\\.toObject\\(': 'bru.cookies.toObject(',
  'pm\\.cookies\\.toString\\(': 'bru.cookies.toString(',
  'pm\\.cookies\\.clear\\(': 'bru.cookies.clear(',
  'pm\\.cookies\\.remove\\(': 'bru.cookies.delete(',
  // PropertyList cookie methods
  'pm\\.cookies\\.one\\(': 'bru.cookies.one(',
  'pm\\.cookies\\.all\\(': 'bru.cookies.all(',
  'pm\\.cookies\\.idx\\(': 'bru.cookies.idx(',
  'pm\\.cookies\\.count\\(': 'bru.cookies.count(',
  'pm\\.cookies\\.indexOf\\(': 'bru.cookies.indexOf(',
  'pm\\.cookies\\.find\\(': 'bru.cookies.find(',
  'pm\\.cookies\\.filter\\(': 'bru.cookies.filter(',
  'pm\\.cookies\\.each\\(': 'bru.cookies.each(',
  'pm\\.cookies\\.map\\(': 'bru.cookies.map(',
  'pm\\.cookies\\.reduce\\(': 'bru.cookies.reduce(',
  'pm\\.cookies\\.add\\(': 'bru.cookies.add(',
  'pm\\.cookies\\.upsert\\(': 'bru.cookies.upsert(',
  // Lossy: position-aware inserts map to add (position irrelevant for cookies)
  'pm\\.cookies\\.prepend\\(': 'bru.cookies.add(',
  'pm\\.cookies\\.insert\\(': 'bru.cookies.add(',
  'pm\\.cookies\\.insertAfter\\(': 'bru.cookies.add('
};

const extendedReplacements = Object.keys(replacements).reduce((acc, key) => {
  const newKey = key.replace(/^pm\\\./, 'postman\\.');
  acc[key] = replacements[key];
  acc[newKey] = replacements[key];
  return acc;
}, {});

const compiledReplacements = Object.entries(extendedReplacements).map(([pattern, replacement]) => ({
  regex: new RegExp(pattern, 'g'),
  replacement
}));

const processRegexReplacement = (code) => {
  for (const { regex, replacement } of compiledReplacements) {
    code = code.replace(regex, replacement);
  }
  return code;
};

const postmanTranslation = (script) => {
  let modifiedScript = Array.isArray(script) ? script.join('\n') : script;
  let translatedScript;

  try {
    translatedScript = translateCode(modifiedScript);
  } catch (e) {
    console.warn('Error in postman translation:', e);

    try {
      translatedScript = processRegexReplacement(modifiedScript);
    } catch (e) {
      console.warn('Error in postman translation:', e);
      translatedScript = modifiedScript;
    }
  }

  return translatedScript;
};

export default postmanTranslation;
