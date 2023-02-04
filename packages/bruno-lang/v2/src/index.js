const ohm = require("ohm-js");
const _ = require('lodash');

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
const grammar = ohm.grammar(`Bru {
  BruFile = (meta | http | querydisabled | query | headersdisabled | headers | bodies | varsandassert | script | test | docs)*
  bodies = bodyjson | bodytext | bodyxml | bodygraphql | bodygraphqlvars | bodyforms
  bodyforms = bodyformurlencodeddisabled | bodyformurlencoded | bodymultipartdisabled | bodymultipart

  nl = "\\r"? "\\n"
  st = " " | "\\t"
  tagend = nl "}"
  validkey = ~(st | ":") any
  validvalue = ~nl any

  // Dictionary Blocks
  dictionary = st* "{" pairlist? tagend
  pairlist = nl* pair (~tagend nl pair)* (~tagend space)*
  pair = st* key st* ":" st* value? st*
  key = ~tagend validkey*
  value = ~tagend validvalue*

  // Text Blocks
  textblock = textline (~tagend nl textline)*
  textline = textchar*
  textchar = ~nl any

  meta = "meta" dictionary

  http = get | post | put | delete | options | head | connect | trace
  get = "get" dictionary
  post = "post" dictionary
  put = "put" dictionary
  delete = "delete" dictionary
  options = "options" dictionary
  head = "head" dictionary
  connect = "connect" dictionary
  trace = "trace" dictionary

  headers = "headers" dictionary
  headersdisabled = "headers:disabled" dictionary

  query = "query" dictionary
  querydisabled = "query:disabled" dictionary

  varsandassert = vars | varsdisabled | varslocal | varslocaldisabled | assert | assertdisabled
  vars = "vars" dictionary
  varsdisabled = "vars:disabled" dictionary
  varslocal = "vars:local" dictionary
  varslocaldisabled = "vars:local:disabled" dictionary
  assert = "assert" dictionary
  assertdisabled = "assert:disabled" dictionary

  bodyjson = "body:json" st* "{" nl* textblock tagend
  bodytext = "body:text" st* "{" nl* textblock tagend
  bodyxml = "body:xml" st* "{" nl* textblock tagend
  bodygraphql = "body:graphql" st* "{" nl* textblock tagend
  bodygraphqlvars = "body:graphql:vars" st* "{" nl* textblock tagend

  bodyformurlencoded = "body:form-urlencoded" dictionary
  bodyformurlencodeddisabled = "body:form-urlencoded:disabled" dictionary
  bodymultipart = "body:multipart-form" dictionary
  bodymultipartdisabled = "body:multipart-form:disabled" dictionary

  script = "script" st* "{" nl* textblock tagend
  test = "test" st* "{" nl* textblock tagend
  docs = "docs" st* "{" nl* textblock tagend
}`);

const mapPairListToKeyValPairs = (pairList = [], enabled = true) => {
  if(!pairList.length) {
    return [];
  }
  return _.map(pairList[0], pair => {
    const key = _.keys(pair)[0];
    return {
      name: key,
      value: pair[key],
      enabled: enabled
    };
  });
};

const concatArrays = (objValue, srcValue) => {
  if (_.isArray(objValue) && _.isArray(srcValue)) {
    return objValue.concat(srcValue);
  }
};

const mapPairListToKeyValPair = (pairList = []) => {
  if(!pairList || !pairList.length) {
    return {};
  }

  return _.merge({}, ...pairList[0]);
}

const sem = grammar.createSemantics().addAttribute('ast', {
  BruFile(tags) {
    if(!tags || !tags.ast || !tags.ast.length) {
      return {};
    }

    return _.reduce(tags.ast, (result, item) => {
      return _.mergeWith(result, item, concatArrays);
    }, {});
  },
  dictionary(_1, _2, pairlist, _3) {
    return pairlist.ast;
  },
  pairlist(_1, pair, _2, rest, _3) {
    return [pair.ast, ...rest.ast];
  },
  pair(_1, key, _2, _3, _4, value, _5) {
    let res = {};
    res[key.ast] = _.get(value, 'ast[0]', '');
    return res;
  },
  key(chars) {
    return chars.sourceString;
  },
  value(chars) {
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  meta(_1, dictionary) {
    return {
      meta: mapPairListToKeyValPair(dictionary.ast)
    };
  },
  get(_1, dictionary) {
    return {
      http: {
        method: 'GET',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  post(_1, dictionary) {
    return {
      http: {
        method: 'POST',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  put(_1, dictionary) {
    return {
      http: {
        method: 'PUT',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  delete(_1, dictionary) {
    return {
      http: {
        method: 'DELETE',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  options(_1, dictionary) {
    return {
      http: {
        method: 'OPTIONS',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  head(_1, dictionary) {
    return {
      http: {
        method: 'HEAD',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  connect(_1, dictionary) {
    return {
      http: {
        method: 'CONNECT',
        ...mapPairListToKeyValPair(dictionary.ast)
      }
    };
  },
  query(_1, dictionary) {
    return {
      query: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  querydisabled(_1, dictionary) {
    return {
      query: mapPairListToKeyValPairs(dictionary.ast, false)
    };
  },
  headers(_1, dictionary) {
    return {
      headers: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  headersdisabled(_1, dictionary) {
    return {
      headers: mapPairListToKeyValPairs(dictionary.ast, false)
    };
  },
  bodyformurlencoded(_1, dictionary) {
    return {
      body: {
        formUrlEncoded: mapPairListToKeyValPairs(dictionary.ast)
      }
    };
  },
  bodyformurlencodeddisabled(_1, dictionary) {
    return {
      body: {
        formUrlEncoded: mapPairListToKeyValPairs(dictionary.ast, false)
      }
    };
  },
  bodymultipart(_1, dictionary) {
    return {
      body: {
        multipartForm: mapPairListToKeyValPairs(dictionary.ast)
      }
    };
  },
  bodymultipartdisabled(_1, dictionary) {
    return {
      body: {
        multipartForm: mapPairListToKeyValPairs(dictionary.ast, false)
      }
    };
  },
  bodyjson(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        json: textblock.sourceString
      }
    };
  },
  bodytext(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        text: textblock.sourceString
      }
    };
  },
  bodyxml(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        xml: textblock.sourceString
      }
    };
  },
  bodygraphql(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        graphql: {
          query: textblock.sourceString
        }
      }
    };
  },
  bodygraphqlvars(_1, _2, _3, _4, textblock, _5) {
    return {
      body: {
        graphql: {
          variables: textblock.sourceString
        }
      }
    };
  },
  vars(_1, dictionary) {
    return {
      vars: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  varsdisabled(_1, dictionary) {
    return {
      vars: mapPairListToKeyValPairs(dictionary.ast, false)
    };
  },
  varslocal(_1, dictionary) {
    return {
      varsLocal: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  varslocaldisabled(_1, dictionary) {
    return {
      varsLocal: mapPairListToKeyValPairs(dictionary.ast, false)
    };
  },
  assert(_1, dictionary) {
    return {
      assert: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  assertdisabled(_1, dictionary) {
    return {
      assert: mapPairListToKeyValPairs(dictionary.ast, false)
    };
  },
  script(_1, _2, _3, _4, textblock, _5) {
    return {
      script: textblock.sourceString
    };
  },
  test(_1, _2, _3, _4, textblock, _5) {
    return {
      test: textblock.sourceString
    };;
  },
  docs(_1, _2, _3, _4, textblock, _5) {
    return {
      docs: textblock.sourceString
    };
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
  tagend(_1 ,_2) {
    return '';
  },
  _iter(...elements) {
    return elements.map(e => e.ast);
  }
});

const parser = (input) => {
  const match = grammar.match(input);

  if(match.succeeded()) {
    return sem(match).ast;
  } else {
    throw new Error(match.message);
  }
}

module.exports = parser;
