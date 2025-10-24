const ohm = require('ohm-js');
const _ = require('lodash');
const { safeParseJson, outdentString } = require('./utils');

const grammar = ohm.grammar(`Bru {
  BruFile = (meta | query | headers | auth | auths | vars | script | tests | docs)*
  auths = authawsv4 | authbasic | authbearer | authdigest | authNTLM |authOAuth2 | authwsse | authapikey | authedgegrid | authOauth2Configs

  // Oauth2 additional parameters
  authOauth2Configs = oauth2AuthReqConfig | oauth2AccessTokenReqConfig | oauth2RefreshTokenReqConfig
  oauth2AuthReqConfig = oauth2AuthReqHeaders | oauth2AuthReqQueryParams 
  oauth2AccessTokenReqConfig = oauth2AccessTokenReqHeaders | oauth2AccessTokenReqQueryParams | oauth2AccessTokenReqBody
  oauth2RefreshTokenReqConfig = oauth2RefreshTokenReqHeaders | oauth2RefreshTokenReqQueryParams | oauth2RefreshTokenReqBody

  nl = "\\r"? "\\n"
  st = " " | "\\t"
  stnl = st | nl
  tagend = nl "}"
  optionalnl = ~tagend nl
  keychar = ~(tagend | st | nl | ":") any
  valuechar = ~(nl | tagend) any

  // Dictionary Blocks
  dictionary = st* "{" pairlist? tagend
  pairlist = optionalnl* pair (~tagend stnl* pair)* (~tagend space)*
  pair = st* key st* ":" st* value st*
  key = keychar*
  value = valuechar*

  // Text Blocks
  textblock = textline (~tagend nl textline)*
  textline = textchar*
  textchar = ~nl any
  
  meta = "meta" dictionary

  auth = "auth" dictionary

  oauth2AuthReqHeaders = "auth:oauth2:additional_params:auth_req:headers" dictionary
  oauth2AuthReqQueryParams = "auth:oauth2:additional_params:auth_req:queryparams" dictionary
  oauth2AccessTokenReqHeaders = "auth:oauth2:additional_params:access_token_req:headers" dictionary
  oauth2AccessTokenReqQueryParams = "auth:oauth2:additional_params:access_token_req:queryparams" dictionary
  oauth2AccessTokenReqBody = "auth:oauth2:additional_params:access_token_req:body" dictionary
  oauth2RefreshTokenReqHeaders = "auth:oauth2:additional_params:refresh_token_req:headers" dictionary
  oauth2RefreshTokenReqQueryParams = "auth:oauth2:additional_params:refresh_token_req:queryparams" dictionary
  oauth2RefreshTokenReqBody = "auth:oauth2:additional_params:refresh_token_req:body" dictionary

  headers = "headers" dictionary

  query = "query" dictionary

  vars = varsreq | varsres
  varsreq = "vars:pre-request" dictionary
  varsres = "vars:post-response" dictionary

  authawsv4 = "auth:awsv4" dictionary
  authbasic = "auth:basic" dictionary
  authbearer = "auth:bearer" dictionary
  authdigest = "auth:digest" dictionary
  authNTLM = "auth:ntlm" dictionary
  authOAuth2 = "auth:oauth2" dictionary
  authwsse = "auth:wsse" dictionary
  authapikey = "auth:apikey" dictionary
  authedgegrid = "auth:edgegrid" dictionary

  script = scriptreq | scriptres
  scriptreq = "script:pre-request" st* "{" nl* textblock tagend
  scriptres = "script:post-response" st* "{" nl* textblock tagend
  tests = "tests" st* "{" nl* textblock tagend
  docs = "docs" st* "{" nl* textblock tagend
}`);

const mapPairListToKeyValPairs = (pairList = [], parseEnabled = true) => {
  if (!pairList.length) {
    return [];
  }
  return _.map(pairList[0], (pair) => {
    let name = _.keys(pair)[0];
    let value = pair[name];

    if (!parseEnabled) {
      return {
        name,
        value
      };
    }

    let enabled = true;
    if (name && name.length && name.charAt(0) === '~') {
      name = name.slice(1);
      enabled = false;
    }

    return {
      name,
      value,
      enabled
    };
  });
};

const concatArrays = (objValue, srcValue) => {
  if (_.isArray(objValue) && _.isArray(srcValue)) {
    return objValue.concat(srcValue);
  }
};

const mapPairListToKeyValPair = (pairList = []) => {
  if (!pairList || !pairList.length) {
    return {};
  }

  return _.merge({}, ...pairList[0]);
};

const sem = grammar.createSemantics().addAttribute('ast', {
  BruFile(tags) {
    if (!tags || !tags.ast || !tags.ast.length) {
      return {};
    }

    return _.reduce(
      tags.ast,
      (result, item) => {
        return _.mergeWith(result, item, concatArrays);
      },
      {}
    );
  },
  dictionary(_1, _2, pairlist, _3) {
    return pairlist.ast;
  },
  pairlist(_1, pair, _2, rest, _3) {
    return [pair.ast, ...rest.ast];
  },
  pair(_1, key, _2, _3, _4, value, _5) {
    let res = {};
    res[key.ast] = value.ast ? value.ast.trim() : '';
    return res;
  },
  key(chars) {
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  value(chars) {
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  textblock(line, _1, rest) {
    return [line.ast, ...rest.ast].join('\n');
  },
  textline(chars) {
    return chars.sourceString;
  },
  textchar(char) {
    return char.sourceString;
  },
  nl(_1, _2) {
    return '';
  },
  st(_) {
    return '';
  },
  tagend(_1, _2) {
    return '';
  },
  _iter(...elements) {
    return elements.map((e) => e.ast);
  },
  meta(_1, dictionary) {
    let meta = mapPairListToKeyValPair(dictionary.ast) || {};

    meta.type = 'collection';

    return {
      meta
    };
  },
  auth(_1, dictionary) {
    let auth = mapPairListToKeyValPair(dictionary.ast) || {};

    return {
      auth: {
        mode: auth?.mode || 'none'
      }
    };
  },
  query(_1, dictionary) {
    return {
      query: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  headers(_1, dictionary) {
    return {
      headers: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  authawsv4(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const accessKeyIdKey = _.find(auth, { name: 'accessKeyId' });
    const secretAccessKeyKey = _.find(auth, { name: 'secretAccessKey' });
    const sessionTokenKey = _.find(auth, { name: 'sessionToken' });
    const serviceKey = _.find(auth, { name: 'service' });
    const regionKey = _.find(auth, { name: 'region' });
    const profileNameKey = _.find(auth, { name: 'profileName' });
    const accessKeyId = accessKeyIdKey ? accessKeyIdKey.value : '';
    const secretAccessKey = secretAccessKeyKey ? secretAccessKeyKey.value : '';
    const sessionToken = sessionTokenKey ? sessionTokenKey.value : '';
    const service = serviceKey ? serviceKey.value : '';
    const region = regionKey ? regionKey.value : '';
    const profileName = profileNameKey ? profileNameKey.value : '';
    return {
      auth: {
        awsv4: {
          accessKeyId,
          secretAccessKey,
          sessionToken,
          service,
          region,
          profileName
        }
      }
    };
  },
  authbasic(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const usernameKey = _.find(auth, { name: 'username' });
    const passwordKey = _.find(auth, { name: 'password' });
    const username = usernameKey ? usernameKey.value : '';
    const password = passwordKey ? passwordKey.value : '';
    return {
      auth: {
        basic: {
          username,
          password
        }
      }
    };
  },
  authbearer(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const tokenKey = _.find(auth, { name: 'token' });
    const token = tokenKey ? tokenKey.value : '';
    return {
      auth: {
        bearer: {
          token
        }
      }
    };
  },
  authdigest(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const usernameKey = _.find(auth, { name: 'username' });
    const passwordKey = _.find(auth, { name: 'password' });
    const username = usernameKey ? usernameKey.value : '';
    const password = passwordKey ? passwordKey.value : '';
    return {
      auth: {
        digest: {
          username,
          password
        }
      }
    };
  },
  authNTLM(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const usernameKey = _.find(auth, { name: 'username' });
    const passwordKey = _.find(auth, { name: 'password' });
    const domainKey = _.find(auth, { name: 'domain' });

    const username = usernameKey ? usernameKey.value : '';
    const password = passwordKey ? passwordKey.value : '';
    const domain = domainKey ? domainKey.value : '';

    return {
      auth: {
        ntlm: {
          username,
          password,
          domain
        }
      }
    };
  },
  authOAuth2(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const grantTypeKey = _.find(auth, { name: 'grant_type' });
    const usernameKey = _.find(auth, { name: 'username' });
    const passwordKey = _.find(auth, { name: 'password' });
    const callbackUrlKey = _.find(auth, { name: 'callback_url' });
    const authorizationUrlKey = _.find(auth, { name: 'authorization_url' });
    const accessTokenUrlKey = _.find(auth, { name: 'access_token_url' });
    const refreshTokenUrlKey = _.find(auth, { name: 'refresh_token_url' });
    const clientIdKey = _.find(auth, { name: 'client_id' });
    const clientSecretKey = _.find(auth, { name: 'client_secret' });
    const scopeKey = _.find(auth, { name: 'scope' });
    const stateKey = _.find(auth, { name: 'state' });
    const pkceKey = _.find(auth, { name: 'pkce' });
    const credentialsPlacementKey = _.find(auth, { name: 'credentials_placement' });
    const credentialsIdKey = _.find(auth, { name: 'credentials_id' });
    const tokenPlacementKey = _.find(auth, { name: 'token_placement' });
    const tokenHeaderPrefixKey = _.find(auth, { name: 'token_header_prefix' });
    const tokenQueryKeyKey = _.find(auth, { name: 'token_query_key' });
    const autoFetchTokenKey = _.find(auth, { name: 'auto_fetch_token' });
    const autoRefreshTokenKey = _.find(auth, { name: 'auto_refresh_token' });
    return {
      auth: {
        oauth2:
          grantTypeKey?.value && grantTypeKey?.value == 'password'
            ? {
                grantType: grantTypeKey ? grantTypeKey.value : '',
                accessTokenUrl: accessTokenUrlKey ? accessTokenUrlKey.value : '',
                refreshTokenUrl: refreshTokenUrlKey ? refreshTokenUrlKey.value : '',
                username: usernameKey ? usernameKey.value : '',
                password: passwordKey ? passwordKey.value : '',
                clientId: clientIdKey ? clientIdKey.value : '',
                clientSecret: clientSecretKey ? clientSecretKey.value : '',
                scope: scopeKey ? scopeKey.value : '',
                credentialsPlacement: credentialsPlacementKey?.value ? credentialsPlacementKey.value : 'body',
                credentialsId: credentialsIdKey?.value ? credentialsIdKey.value : 'credentials',
                tokenPlacement: tokenPlacementKey?.value ? tokenPlacementKey.value : 'header',
                tokenHeaderPrefix: tokenHeaderPrefixKey?.value ? tokenHeaderPrefixKey.value : '',
                tokenQueryKey: tokenQueryKeyKey?.value ? tokenQueryKeyKey.value : 'access_token',
                autoFetchToken: autoFetchTokenKey ? safeParseJson(autoFetchTokenKey?.value) ?? true : true,
                autoRefreshToken: autoRefreshTokenKey ? safeParseJson(autoRefreshTokenKey?.value) ?? false : false
              }
            : grantTypeKey?.value && grantTypeKey?.value == 'authorization_code'
            ? {
                grantType: grantTypeKey ? grantTypeKey.value : '',
                callbackUrl: callbackUrlKey ? callbackUrlKey.value : '',
                authorizationUrl: authorizationUrlKey ? authorizationUrlKey.value : '',
                accessTokenUrl: accessTokenUrlKey ? accessTokenUrlKey.value : '',
                refreshTokenUrl: refreshTokenUrlKey ? refreshTokenUrlKey.value : '',
                clientId: clientIdKey ? clientIdKey.value : '',
                clientSecret: clientSecretKey ? clientSecretKey.value : '',
                scope: scopeKey ? scopeKey.value : '',
                state: stateKey ? stateKey.value : '',
                pkce: pkceKey ? safeParseJson(pkceKey?.value) ?? false : false,
                credentialsPlacement: credentialsPlacementKey?.value ? credentialsPlacementKey.value : 'body',
                credentialsId: credentialsIdKey?.value ? credentialsIdKey.value : 'credentials',
                tokenPlacement: tokenPlacementKey?.value ? tokenPlacementKey.value : 'header',
                tokenHeaderPrefix: tokenHeaderPrefixKey?.value ? tokenHeaderPrefixKey.value : '',
                tokenQueryKey: tokenQueryKeyKey?.value ? tokenQueryKeyKey.value : 'access_token',
                autoFetchToken: autoFetchTokenKey ? safeParseJson(autoFetchTokenKey?.value) ?? true : true,
                autoRefreshToken: autoRefreshTokenKey ? safeParseJson(autoRefreshTokenKey?.value) ?? false : false
              }
            : grantTypeKey?.value && grantTypeKey?.value == 'implicit'
            ? {
                grantType: grantTypeKey ? grantTypeKey.value : '',
                callbackUrl: callbackUrlKey ? callbackUrlKey.value : '',
                authorizationUrl: authorizationUrlKey ? authorizationUrlKey.value : '',
                clientId: clientIdKey ? clientIdKey.value : '',
                scope: scopeKey ? scopeKey.value : '',
                state: stateKey ? stateKey.value : '',
                credentialsId: credentialsIdKey?.value ? credentialsIdKey.value : 'credentials',
                tokenPlacement: tokenPlacementKey?.value ? tokenPlacementKey.value : 'header',
                tokenHeaderPrefix: tokenHeaderPrefixKey?.value ? tokenHeaderPrefixKey.value : '',
                tokenQueryKey: tokenQueryKeyKey?.value ? tokenQueryKeyKey.value : 'access_token',
                autoFetchToken: autoFetchTokenKey ? safeParseJson(autoFetchTokenKey?.value) ?? true : true,
              }
            : grantTypeKey?.value && grantTypeKey?.value == 'client_credentials'
            ? {
                grantType: grantTypeKey ? grantTypeKey.value : '',
                accessTokenUrl: accessTokenUrlKey ? accessTokenUrlKey.value : '',
                refreshTokenUrl: refreshTokenUrlKey ? refreshTokenUrlKey.value : '',
                clientId: clientIdKey ? clientIdKey.value : '',
                clientSecret: clientSecretKey ? clientSecretKey.value : '',
                scope: scopeKey ? scopeKey.value : '',
                credentialsPlacement: credentialsPlacementKey?.value ? credentialsPlacementKey.value : 'body',
                credentialsId: credentialsIdKey?.value ? credentialsIdKey.value : 'credentials',
                tokenPlacement: tokenPlacementKey?.value ? tokenPlacementKey.value : 'header',
                tokenHeaderPrefix: tokenHeaderPrefixKey?.value ? tokenHeaderPrefixKey.value : '',
                tokenQueryKey: tokenQueryKeyKey?.value ? tokenQueryKeyKey.value : 'access_token',
                autoFetchToken: autoFetchTokenKey ? safeParseJson(autoFetchTokenKey?.value) ?? true : true,
                autoRefreshToken: autoRefreshTokenKey ? safeParseJson(autoRefreshTokenKey?.value) ?? false : false
              }
            : {}
      }
    };
  },
  oauth2AuthReqHeaders(_1, dictionary) {
    return {
      oauth2_additional_parameters_auth_req_headers: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  oauth2AuthReqQueryParams(_1, dictionary) {
    return {
      oauth2_additional_parameters_auth_req_queryparams: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  oauth2AccessTokenReqHeaders(_1, dictionary) {
    return {
      oauth2_additional_parameters_access_token_req_headers: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  oauth2AccessTokenReqQueryParams(_1, dictionary) {
    return {
      oauth2_additional_parameters_access_token_req_queryparams: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  oauth2AccessTokenReqBody(_1, dictionary) {
    return {
      oauth2_additional_parameters_access_token_req_bodyvalues: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  oauth2RefreshTokenReqHeaders(_1, dictionary) {
    return {
      oauth2_additional_parameters_refresh_token_req_headers: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  oauth2RefreshTokenReqQueryParams(_1, dictionary) {
    return {
      oauth2_additional_parameters_refresh_token_req_queryparams: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  oauth2RefreshTokenReqBody(_1, dictionary) {
    return {
      oauth2_additional_parameters_refresh_token_req_bodyvalues: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  authwsse(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);
    const userKey = _.find(auth, { name: 'username' });
    const secretKey = _.find(auth, { name: 'password' });
    const username = userKey ? userKey.value : '';
    const password = secretKey ? secretKey.value : '';
    return {
      auth: {
        wsse: {
          username,
          password
        }
      }
    }
  }, 
  authapikey(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);

    const findValueByName = (name) => {
      const item = _.find(auth, { name });
      return item ? item.value : '';
    };

    const key = findValueByName('key');
    const value = findValueByName('value');
    const placement = findValueByName('placement');

    return {
      auth: {
        apikey: {
          key,
          value,
          placement
        }
      }
    };
  },
  authedgegrid(_1, dictionary) {
    const auth = mapPairListToKeyValPairs(dictionary.ast, false);

    const findValueByName = (name) => {
      const item = _.find(auth, { name });
      return item ? item.value : '';
    };

    const access_token = findValueByName('access_token');
    const client_token = findValueByName('client_token');
    const client_secret = findValueByName('client_secret');
    const nonce = findValueByName('nonce');
    const timestamp = findValueByName('timestamp');
    const base_url = findValueByName('base_url');
    const headers_to_sign = findValueByName('headers_to_sign');
    const max_body_size = findValueByName('max_body_size');

    return {
      auth: {
        edgegrid: {
          access_token,
          client_token,
          client_secret,
          nonce,
          timestamp,
          base_url,
          headers_to_sign,
          max_body_size
        }
      }
    };
  },
  varsreq(_1, dictionary) {
    const vars = mapPairListToKeyValPairs(dictionary.ast);
    _.each(vars, (v) => {
      let name = v.name;
      if (name && name.length && name.charAt(0) === '@') {
        v.name = name.slice(1);
        v.local = true;
      } else {
        v.local = false;
      }
    });

    return {
      vars: {
        req: vars
      }
    };
  },
  varsres(_1, dictionary) {
    const vars = mapPairListToKeyValPairs(dictionary.ast);
    _.each(vars, (v) => {
      let name = v.name;
      if (name && name.length && name.charAt(0) === '@') {
        v.name = name.slice(1);
        v.local = true;
      } else {
        v.local = false;
      }
    });

    return {
      vars: {
        res: vars
      }
    };
  },
  scriptreq(_1, _2, _3, _4, textblock, _5) {
    return {
      script: {
        req: outdentString(textblock.sourceString)
      }
    };
  },
  scriptres(_1, _2, _3, _4, textblock, _5) {
    return {
      script: {
        res: outdentString(textblock.sourceString)
      }
    };
  },
  tests(_1, _2, _3, _4, textblock, _5) {
    return {
      tests: outdentString(textblock.sourceString)
    };
  },
  docs(_1, _2, _3, _4, textblock, _5) {
    return {
      docs: outdentString(textblock.sourceString)
    };
  }
});

const parser = (input) => {
  const match = grammar.match(input);

  if (match.succeeded()) {
    let ast = sem(match).ast;

    return ast;
  } else {
    throw new Error(match.message);
  }
};

module.exports = parser;
