const ohm = require('ohm-js');
const _ = require('lodash');
const { safeParseJson, outdentString } = require('./utils');

/**
 * A Bru file is made up of blocks.
 * There are three types of blocks
 *
 * 1. Dictionary Blocks - These are blocks that have key value pairs
 * ex:
 *  headers {
 *   content-type: application/json
 *  }
 *
 * 2. Text Blocks - These are blocks that have text
 * ex:
 * body:json {
 *  {
 *   "username": "John Nash",
 *   "password": "governingdynamics
 *  }

 * 3. List Blocks - These are blocks that have a list of items
 * ex:
 *  tags [
 *   regression
 *   smoke-test
 *  ]
 *
 */
const grammar = ohm.grammar(`Bru {
  BruFile = (meta | http | query | params | headers | auths | bodies | varsandassert | script | tests | settings | docs)*
  auths = authawsv4 | authbasic | authbearer | authdigest | authNTLM | authOAuth2 | authwsse | authapikey
  bodies = bodyjson | bodytext | bodyxml | bodysparql | bodygraphql | bodygraphqlvars | bodyforms | body
  bodyforms = bodyformurlencoded | bodymultipart | bodyfile
  params = paramspath | paramsquery

  nl = "\\r"? "\\n"
  st = " " | "\\t"
  stnl = st | nl
  tagend = nl "}"
  optionalnl = ~tagend nl
  keychar = ~(tagend | st | nl | ":") any
  valuechar = ~(nl | tagend) any

   // Multiline text block surrounded by '''
  multilinetextblockdelimiter = "'''"
  multilinetextblock = multilinetextblockdelimiter (~multilinetextblockdelimiter any)* multilinetextblockdelimiter

  // Dictionary Blocks
  dictionary = st* "{" pairlist? tagend
  pairlist = optionalnl* pair (~tagend stnl* pair)* (~tagend space)*
  pair = st* key st* ":" st* value st*
  key = keychar*
  value = list | multilinetextblock | valuechar*

  // Dictionary for Assert Block
  assertdictionary = st* "{" assertpairlist? tagend
  assertpairlist = optionalnl* assertpair (~tagend stnl* assertpair)* (~tagend space)*
  assertpair = st* assertkey st* ":" st* value st*
  assertkey = ~tagend assertkeychar*
  assertkeychar = ~(tagend | nl | ":") any

  // Text Blocks
  textblock = textline (~tagend nl textline)*
  textline = textchar*
  textchar = ~nl any

  // List
  listend = stnl* "]"
  list = st* "[" listitems? listend
  listitems = (~listend stnl)* listitem (~listend stnl* listitem)* (~listend space)*
  listitem = st* textchar+ st*

  meta = "meta" dictionary
  settings = "settings" dictionary

  http = get | post | put | delete | patch | options | head | connect | trace
  get = "get" dictionary
  post = "post" dictionary
  put = "put" dictionary
  delete = "delete" dictionary
  patch = "patch" dictionary
  options = "options" dictionary
  head = "head" dictionary
  connect = "connect" dictionary
  trace = "trace" dictionary

  headers = "headers" dictionary

  query = "query" dictionary
  paramspath = "params:path" dictionary
  paramsquery = "params:query" dictionary

  varsandassert = varsreq | varsres | assert
  varsreq = "vars:pre-request" dictionary
  varsres = "vars:post-response" dictionary
  assert = "assert" assertdictionary

  authawsv4 = "auth:awsv4" dictionary
  authbasic = "auth:basic" dictionary
  authbearer = "auth:bearer" dictionary
  authdigest = "auth:digest" dictionary
  authNTLM = "auth:ntlm" dictionary
  authOAuth2 = "auth:oauth2" dictionary
  authwsse = "auth:wsse" dictionary
  authapikey = "auth:apikey" dictionary

  body = "body" st* "{" nl* textblock tagend
  bodyjson = "body:json" st* "{" nl* textblock tagend
  bodytext = "body:text" st* "{" nl* textblock tagend
  bodyxml = "body:xml" st* "{" nl* textblock tagend
  bodysparql = "body:sparql" st* "{" nl* textblock tagend
  bodygraphql = "body:graphql" st* "{" nl* textblock tagend
  bodygraphqlvars = "body:graphql:vars" st* "{" nl* textblock tagend

  bodyformurlencoded = "body:form-urlencoded" dictionary
  bodymultipart = "body:multipart-form" dictionary
  bodyfile = "body:file" dictionary
  
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

const mapRequestParams = (pairList = [], type) => {
  if (!pairList.length) {
    return [];
  }
  return _.map(pairList[0], (pair) => {
    let name = _.keys(pair)[0];
    let value = pair[name];
    let enabled = true;
    if (name && name.length && name.charAt(0) === '~') {
      name = name.slice(1);
      enabled = false;
    }

    return {
      name,
      value,
      enabled,
      type
    };
  });
};

const multipartExtractContentType = (pair) => {
  if (_.isString(pair.value)) {
    const match = pair.value.match(/^(.*?)\s*@contentType\((.*?)\)\s*$/);
    if (match != null && match.length > 2) {
      pair.value = match[1];
      pair.contentType = match[2];
    } else {
      pair.contentType = '';
    }
  }
};

const fileExtractContentType = (pair) => {
  if (_.isString(pair.value)) {
    const match = pair.value.match(/^(.*?)\s*@contentType\((.*?)\)\s*$/);
    if (match && match.length > 2) {
      pair.value = match[1].trim();
      pair.contentType = match[2].trim();
    } else {
      pair.contentType = '';
    }
  }
};


const mapPairListToKeyValPairsMultipart = (pairList = [], parseEnabled = true) => {
  const pairs = mapPairListToKeyValPairs(pairList, parseEnabled);

  return pairs.map((pair) => {
    pair.type = 'text';
    multipartExtractContentType(pair);

    if (pair.value.startsWith('@file(') && pair.value.endsWith(')')) {
      let filestr = pair.value.replace(/^@file\(/, '').replace(/\)$/, '');
      pair.type = 'file';
      pair.value = filestr.split('|');
    }

    return pair;
  });
};

const mapPairListToKeyValPairsFile = (pairList = [], parseEnabled = true) => {
  const pairs = mapPairListToKeyValPairs(pairList, parseEnabled);
  return pairs.map((pair) => {
    fileExtractContentType(pair);

    if (pair.value.startsWith('@file(') && pair.value.endsWith(')')) {
      let filePath = pair.value.replace(/^@file\(/, '').replace(/\)$/, '');      
      pair.filePath = filePath;
      pair.selected = pair.enabled
      
      // Remove pair.value as it only contains the file path reference
      delete pair.value;
      // Remove pair.name as it is auto-generated (e.g., file1, file2, file3, etc.)
      delete pair.name;
      delete pair.enabled;
    }

    return pair;
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
    if (Array.isArray(value.ast)) {
      res[key.ast] = value.ast;
      return res;
    }
    res[key.ast] = value.ast ? value.ast.trim() : '';
    return res;
  },
  key(chars) {
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  value(chars) {
    if (chars.ctorName === 'list') {
      return chars.ast;
    }
    try {
      let isMultiline = chars.sourceString?.startsWith(`'''`) && chars.sourceString?.endsWith(`'''`);
      if (isMultiline) {
        const multilineString = chars.sourceString?.replace(/^'''|'''$/g, '');
        return multilineString
          .split('\n')
          .map((line) => line.slice(4))
          .join('\n');
      }
      return chars.sourceString ? chars.sourceString.trim() : '';
    } catch (err) {
      console.error(err);
    }
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  assertdictionary(_1, _2, pairlist, _3) {
    return pairlist.ast;
  },
  assertpairlist(_1, pair, _2, rest, _3) {
    return [pair.ast, ...rest.ast];
  },
  assertpair(_1, key, _2, _3, _4, value, _5) {
    let res = {};
    res[key.ast] = value.ast ? value.ast.trim() : '';
    return res;
  },
  assertkey(chars) {
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  list(_1, _2, listitems, _3) {
    return listitems.ast.flat()
  },
  listitems(_1, listitem, _2, rest, _3) {
    return [listitem.ast, ...rest.ast]
  },
  listitem(_1, textchar, _2) {
    return textchar.sourceString;
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
    let meta = mapPairListToKeyValPair(dictionary.ast);

    if (!meta.seq) {
      meta.seq = 1;
    }

    if (!meta.type) {
      meta.type = 'http';
    }

    return {
      meta
    };
  },
  settings(_1, dictionary) {
    let settings = mapPairListToKeyValPair(dictionary.ast);

    return {
      settings: {
        encodeUrl: typeof settings.encodeUrl === 'boolean' ? settings.encodeUrl : settings.encodeUrl === 'true'
      }
    };
  },
  get(_1, dictionary) {
    return {
      http: {
        method: 'get',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  post(_1, dictionary) {
    return {
      http: {
        method: 'post',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  put(_1, dictionary) {
    return {
      http: {
        method: 'put',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  delete(_1, dictionary) {
    return {
      http: {
        method: 'delete',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  patch(_1, dictionary) {
    return {
      http: {
        method: 'patch',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  options(_1, dictionary) {
    return {
      http: {
        method: 'options',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  head(_1, dictionary) {
    return {
      http: {
        method: 'head',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  connect(_1, dictionary) {
    return {
      http: {
        method: 'connect',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  query(_1, dictionary) {
    return {
      params: mapRequestParams(dictionary.ast, 'query')
    };
  },
  paramspath(_1, dictionary) {
    return {
      params: mapRequestParams(dictionary.ast, 'path')
    };
  },
  paramsquery(_1, dictionary) {
    return {
      params: mapRequestParams(dictionary.ast, 'query')
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
    const domain = passwordKey ? domainKey.value : '';

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
            : {}
      }
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
    };
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
  bodyformurlencoded(_1, dictionary) {
    return {
      body: {
        formUrlEncoded: mapPairListToKeyValPairs(dictionary.ast)
      }
    };
  },
  bodymultipart(_1, dictionary) {
    return {
      body: {
        multipartForm: mapPairListToKeyValPairsMultipart(dictionary.ast)
      }
    };
  },
  bodyfile(_1, dictionary) {
    return {
      body: {
        file: mapPairListToKeyValPairsFile(dictionary.ast)
      }
    };
  },
  body(_1, _2, _3, _4, textblock, _5) {
    return {
      http: {
        body: 'json'
      },
      body: {
        json: outdentString(textblock.sourceString)
      }
    };
  },
  bodyjson(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        json: outdentString(textblock.sourceString)
      }
    };
  },
  bodytext(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        text: outdentString(textblock.sourceString)
      }
    };
  },
  bodyxml(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        xml: outdentString(textblock.sourceString)
      }
    };
  },
  bodysparql(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        sparql: outdentString(textblock.sourceString)
      }
    };
  },
  bodygraphql(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        graphql: {
          query: outdentString(textblock.sourceString)
        }
      }
    };
  },
  bodygraphqlvars(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        graphql: {
          variables: outdentString(textblock.sourceString)
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
  assert(_1, dictionary) {
    return {
      assertions: mapPairListToKeyValPairs(dictionary.ast)
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
    return sem(match).ast;
  } else {
    throw new Error(match.message);
  }
};

module.exports = parser;
      