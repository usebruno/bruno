/**
 * A Bru file is made up of blocks.
 * There are two types of blocks
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
 *
 */

BruFile = OptionalNL* tags:(Meta / Headers / Http / Query / Params / Auths / Bodies / VarsAndAssert / Script / Tests / Docs)|.., STNL*| STNL* {
  if (!tags || !tags.length) {
    return {};
  }

  return options._.reduce(
    tags,
    (result, item) => {
      return options._.mergeWith(result, item, options.concatArrays);
    },
    {}
  );
}
Auths = AuthAWSV4 / AuthBasic / AuthBearer / AuthDigest / AuthNTLM / AuthOAuth2 / AuthWSSE / AuthApiKey
Bodies = BodyJson / BodyText / BodyXml / BodySparql / BodyGraphql / BodyGraphqlVars / BodyForms / Body
BodyForms = BodyFormUrlEncoded / BodyMultipart / BodyFile
Params = ParamsPath / ParamsQuery

NL "newline" = "\r"? "\n"
ST "space_or_tab" = [ \t]
STNL "space_or_tab_or_newline" = ST / NL
TagEnd = NL "}"
OptionalNL "optional_newline" = !TagEnd NL
KeyChar = !TagEnd !ST !NL !":" .
ValueChar = !NL !TagEnd .

// Multiline text block surrounded by '''
MultilineTextBlockDelimiter = "'''"
MultilineTextBlock = MultilineTextBlockDelimiter $((!MultilineTextBlockDelimiter .)*) MultilineTextBlockDelimiter

// Dictionary Blocks
Dictionary = ST* "{" @PairList? TagEnd
PairList = OptionalNL* @Pair|.., PairDelimiter| PairDelimiter?
PairDelimiter = (!TagEnd STNL)*
Pair = ST* key:Key ST* ":" ST* value:Value {
  return {
    [key]: value?.trim() ?? ''
  };
}
Key = key:$(KeyChar*) {
  return key?.trim() ?? ''
}
Value =
  multiline:MultilineTextBlock {
    return multiline
      ?.replace(/^'''|'''$/g, '')
      .split('\n')
      .map((line) => line.slice(4))
      .join('\n');
  }
  / value:$(ValueChar*) {
    return value?.trim() ?? ''
  }

// Dictionary for Assert Block
AssertDictionary = ST* "{" @AssertPairList? TagEnd
AssertPairList = OptionalNL* @AssertPair|.., PairDelimiter| PairDelimiter?
AssertPair = ST* key:AssertKey ST* ":" ST* value:Value {
  return {
    [key]: value?.trim() ?? ''
  };
}
AssertKey = key:$(AssertKeyChar*) {
  return key?.trim() ?? ''
}
AssertKeyChar = !TagEnd !NL !":" .

// Text Blocks
TextBlock = lines:TextLine|.., !TagEnd NL| {
  return lines?.map(line => line.slice(2))?.join('\n') ?? ''
}
TextLine = $(TextChar*)
TextChar = !NL .

Meta = "meta" dict:Dictionary {
  let meta = options.mapPairListToKeyValPair(dict) || {};

  if (!meta.seq) {
    meta.seq = 1;
  }

  if (!meta.type) {
    meta.type = 'http';
  }

  return {
    meta
  };
}

Http = Get / Post / Put / Delete / Patch / Options / Head / Connect / Trace

Get = "get" dict:Dictionary {
  return {
    http: {
      method: 'get',
      ...options.mapPairListToKeyValPair(dict)
    }
  };
}

Post = "post" dict:Dictionary {
  return {
    http: {
      method: 'post',
      ...options.mapPairListToKeyValPair(dict)
    }
  };
}

Put = "put" dict:Dictionary {
  return {
    http: {
      method: 'put',
      ...options.mapPairListToKeyValPair(dict)
    }
  };
}

Delete = "delete" dict:Dictionary {
  return {
    http: {
      method: 'delete',
      ...options.mapPairListToKeyValPair(dict)
    }
  };
}

Patch = "patch" dict:Dictionary {
  return {
    http: {
      method: 'patch',
      ...options.mapPairListToKeyValPair(dict)
    }
  };
}

Options = "options" dict:Dictionary {
  return {
    http: {
      method: 'options',
      ...options.mapPairListToKeyValPair(dict)
    }
  };
}

Head = "head" dict:Dictionary {
  return {
    http: {
      method: 'head',
      ...options.mapPairListToKeyValPair(dict)
    }
  };
}

Connect = "connect" dict:Dictionary {
  return {
    http: {
      method: 'connect',
      ...options.mapPairListToKeyValPair(dict)
    }
  };
}

Trace = "trace" dict:Dictionary {
  return {
    http: {
      method: 'trace',
      ...options.mapPairListToKeyValPair(dict)
    }
  };
}

Headers = "headers" dict:Dictionary{
  return {
    headers: options.mapPairListToKeyValPairs(dict)
  };
}

Query = "query" dict:Dictionary {
  return {
    params: options.mapRequestParams(dict, 'query')
  };
}

ParamsPath = "params:path" dict:Dictionary {
  return {
    params: options.mapRequestParams(dict, 'path')
  };
}

ParamsQuery = "params:query" dict:Dictionary {
  return {
    params: options.mapRequestParams(dict, 'query')
  };
}

VarsAndAssert = VarsReq / VarsRes / Assert

VarsReq = "vars:pre-request" dict:Dictionary {
  const vars = options.mapPairListToKeyValPairs(dict);
  options._.each(vars, (v) => {
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
}

VarsRes = "vars:post-response" dict:Dictionary {
  const vars = options.mapPairListToKeyValPairs(dict);
  options._.each(vars, (v) => {
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
}

Assert = "assert" dict:AssertDictionary {
  return {
    assertions: options.mapPairListToKeyValPairs(dict)
  };
}

AuthAWSV4 = "auth:awsv4" dict:Dictionary {
  const auth = options.mapPairListToKeyValPairs(dict, false);
  const accessKeyIdKey = options._.find(auth, { name: 'accessKeyId' });
  const secretAccessKeyKey = options._.find(auth, { name: 'secretAccessKey' });
  const sessionTokenKey = options._.find(auth, { name: 'sessionToken' });
  const serviceKey = options._.find(auth, { name: 'service' });
  const regionKey = options._.find(auth, { name: 'region' });
  const profileNameKey = options._.find(auth, { name: 'profileName' });
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
}

AuthBasic = "auth:basic" dict:Dictionary {
  const auth = options.mapPairListToKeyValPairs(dict, false);
  const usernameKey = options._.find(auth, { name: 'username' });
  const passwordKey = options._.find(auth, { name: 'password' });
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
}

AuthBearer = "auth:bearer" dict:Dictionary {
  const auth = options.mapPairListToKeyValPairs(dict, false);
  const tokenKey = options._.find(auth, { name: 'token' });
  const token = tokenKey ? tokenKey.value : '';
  return {
    auth: {
      bearer: {
        token
      }
    }
  };
}

AuthDigest = "auth:digest" dict:Dictionary {
  const auth = options.mapPairListToKeyValPairs(dict, false);
  const usernameKey = options._.find(auth, { name: 'username' });
  const passwordKey = options._.find(auth, { name: 'password' });
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
}

AuthNTLM = "auth:ntlm" dict:Dictionary {
  const auth = options.mapPairListToKeyValPairs(dict, false);
  const usernameKey = options._.find(auth, { name: 'username' });
  const passwordKey = options._.find(auth, { name: 'password' });
  const domainKey = options._.find(auth, { name: 'domain' });

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
}

AuthOAuth2 = "auth:oauth2" dict:Dictionary {
  const auth = options.mapPairListToKeyValPairs(dict, false);
  const grantTypeKey = options._.find(auth, { name: 'grant_type' });
  const usernameKey = options._.find(auth, { name: 'username' });
  const passwordKey = options._.find(auth, { name: 'password' });
  const callbackUrlKey = options._.find(auth, { name: 'callback_url' });
  const authorizationUrlKey = options._.find(auth, { name: 'authorization_url' });
  const accessTokenUrlKey = options._.find(auth, { name: 'access_token_url' });
  const refreshTokenUrlKey = options._.find(auth, { name: 'refresh_token_url' });
  const clientIdKey = options._.find(auth, { name: 'client_id' });
  const clientSecretKey = options._.find(auth, { name: 'client_secret' });
  const scopeKey = options._.find(auth, { name: 'scope' });
  const stateKey = options._.find(auth, { name: 'state' });
  const pkceKey = options._.find(auth, { name: 'pkce' });
  const credentialsPlacementKey = options._.find(auth, { name: 'credentials_placement' });
  const credentialsIdKey = options._.find(auth, { name: 'credentials_id' });
  const tokenPlacementKey = options._.find(auth, { name: 'token_placement' });
  const tokenHeaderPrefixKey = options._.find(auth, { name: 'token_header_prefix' });
  const tokenQueryKeyKey = options._.find(auth, { name: 'token_query_key' });
  const autoFetchTokenKey = options._.find(auth, { name: 'auto_fetch_token' });
  const autoRefreshTokenKey = options._.find(auth, { name: 'auto_refresh_token' });
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
              autoFetchToken: autoFetchTokenKey ? options.safeParseJson(autoFetchTokenKey?.value) ?? true : true,
              autoRefreshToken: autoRefreshTokenKey ? options.safeParseJson(autoRefreshTokenKey?.value) ?? false : false
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
              pkce: pkceKey ? options.safeParseJson(pkceKey?.value) ?? false : false,
              credentialsPlacement: credentialsPlacementKey?.value ? credentialsPlacementKey.value : 'body',
              credentialsId: credentialsIdKey?.value ? credentialsIdKey.value : 'credentials',
              tokenPlacement: tokenPlacementKey?.value ? tokenPlacementKey.value : 'header',
              tokenHeaderPrefix: tokenHeaderPrefixKey?.value ? tokenHeaderPrefixKey.value : '',
              tokenQueryKey: tokenQueryKeyKey?.value ? tokenQueryKeyKey.value : 'access_token',
              autoFetchToken: autoFetchTokenKey ? options.safeParseJson(autoFetchTokenKey?.value) ?? true : true,
              autoRefreshToken: autoRefreshTokenKey ? options.safeParseJson(autoRefreshTokenKey?.value) ?? false : false
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
              autoFetchToken: autoFetchTokenKey ? options.safeParseJson(autoFetchTokenKey?.value) ?? true : true,
              autoRefreshToken: autoRefreshTokenKey ? options.safeParseJson(autoRefreshTokenKey?.value) ?? false : false
            }
          : {}
    }
  };
}

AuthWSSE = "auth:wsse" dict:Dictionary {
  const auth = options.mapPairListToKeyValPairs(dict, false);
  const userKey = options._.find(auth, { name: 'username' });
  const secretKey = options._.find(auth, { name: 'password' });
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
}

AuthApiKey = "auth:apikey" dict:Dictionary {
  const auth = options.mapPairListToKeyValPairs(dict, false);

  const findValueByName = (name) => {
    const item = options._.find(auth, { name });
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
}

Body = "body" ST* "{" NL* content:TextBlock TagEnd {
  return {
    http: {
      body: 'json'
    },
    body: {
      json: content
    }
  };
}

BodyJson = "body:json" ST* "{" NL* content:TextBlock TagEnd {
  return {
    body: {
      json: content
    }
  };
}

BodyText = "body:text" ST* "{" NL* content:TextBlock TagEnd {
  return {
    body: {
      text: content
    }
  };
}

BodyXml = "body:xml" ST* "{" NL* content:TextBlock TagEnd {
  return {
    body: {
      xml: content
    }
  };
}

BodySparql = "body:sparql" ST* "{" NL* content:TextBlock TagEnd {
  return {
    body: {
      sparql: content
    }
  };
}

BodyGraphql = "body:graphql" ST* "{" NL* content:TextBlock TagEnd {
  return {
    body: {
      graphql: {
        query: content
      }
    }
  };
}

BodyGraphqlVars = "body:graphql:vars" ST* "{" NL* content:TextBlock TagEnd {
  return {
    body: {
      graphql: {
        variables: content
      }
    }
  };
}

BodyFormUrlEncoded = "body:form-urlencoded" dict:Dictionary {
  return {
    body: {
      formUrlEncoded: options.mapPairListToKeyValPairs(dict)
    }
  };
}

BodyMultipart = "body:multipart-form" dict:Dictionary {
  return {
    body: {
      multipartForm: options.mapPairListToKeyValPairsMultipart(dict)
    }
  };
}

BodyFile = "body:file" dict:Dictionary {
  return {
    body: {
      file: options.mapPairListToKeyValPairsFile(dict)
    }
  };
}

Script = ScriptReq / ScriptRes

ScriptReq = "script:pre-request" ST* "{" NL* content:TextBlock TagEnd {
  return {
    script: {
      req: content
    }
  };
}

ScriptRes = "script:post-response" ST* "{" NL* content:TextBlock TagEnd {
  return {
    script: {
      res: content
    }
  };
}

Tests = "tests" ST* "{" NL* content:TextBlock TagEnd {
  return {
    tests: content
  };
}

Docs = "docs" ST* "{" NL* content:TextBlock TagEnd {
  return {
    docs: content
  };
}