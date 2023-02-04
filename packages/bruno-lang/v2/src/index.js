const ohm = require("ohm-js");
const _ = require('lodash');

const grammar = ohm.grammar(`Bru {
  BruFile = (script | test | querydisabled | query | headersdisabled | headers | bodies )*
  bodies = bodyjson | bodytext | bodyxml | bodygraphql | bodygraphqlvars | bodyforms
  bodyforms = bodyformurlencodeddisabled | bodyformurlencoded | bodymultipartdisabled | bodymultipart
  nl = "\\r"? "\\n"
  st = " " | "\\t"
  tagend = nl "}"
  validkey = ~(st | ":") any
  validvalue = ~nl any

  headers = "headers" pairblock
  headersdisabled = "headers:disabled" pairblock

  query = "query" pairblock
  querydisabled = "query:disabled" pairblock

  pairblock = st* "{" pairlist? tagend
  pairlist = nl* pair (~tagend nl pair)* (~tagend space)*
  pair = st* key st* ":" st* value? st*
  key = ~tagend validkey*
  value = ~tagend validvalue*

  bodyjson = "body:json" st* "{" nl* textblock tagend
  bodytext = "body:text" st* "{" nl* textblock tagend
  bodyxml = "body:xml" st* "{" nl* textblock tagend
  bodygraphql = "body:graphql" st* "{" nl* textblock tagend
  bodygraphqlvars = "body:graphql:vars" st* "{" nl* textblock tagend

  bodyformurlencoded = "body:form-urlencoded" pairblock
  bodyformurlencodeddisabled = "body:form-urlencoded:disabled" pairblock
  bodymultipart = "body:multipart-form" pairblock
  bodymultipartdisabled = "body:multipart-form:disabled" pairblock

  script = "script" st* "{" nl* textblock tagend
  test = "test" st* "{" textblock tagend

  textblock = textline (~tagend nl textline)*
  textline = textchar*
  textchar = ~nl any
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

const sem = grammar.createSemantics().addAttribute('ast', {
  BruFile(tags) {
    if(!tags || !tags.ast || !tags.ast.length) {
      return {};
    }

    return _.reduce(tags.ast, (result, item) => {
      return _.mergeWith(result, item, concatArrays);
    }, {});
  },
  query(_1, pairblock) {
    return {
      query: mapPairListToKeyValPairs(pairblock.ast)
    };
  },
  querydisabled(_1, pairblock) {
    return {
      query: mapPairListToKeyValPairs(pairblock.ast, false)
    };
  },
  headers(_1, pairblock) {
    return {
      headers: mapPairListToKeyValPairs(pairblock.ast)
    };
  },
  headersdisabled(_1, pairblock) {
    return {
      headers: mapPairListToKeyValPairs(pairblock.ast, false)
    };
  },
  pairblock(_1, _2, pairlist, _3) {
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
  bodyformurlencoded(_1, pairblock) {
    return {
      body: {
        formUrlEncoded: mapPairListToKeyValPairs(pairblock.ast)
      }
    };
  },
  bodyformurlencodeddisabled(_1, pairblock) {
    return {
      body: {
        formUrlEncoded: mapPairListToKeyValPairs(pairblock.ast, false)
      }
    };
  },
  bodymultipart(_1, pairblock) {
    return {
      body: {
        multipartForm: mapPairListToKeyValPairs(pairblock.ast)
      }
    };
  },
  bodymultipartdisabled(_1, pairblock) {
    return {
      body: {
        multipartForm: mapPairListToKeyValPairs(pairblock.ast, false)
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
  script(_1, _2, _3, _4, textblock, _5) {
    return {
      script: textblock.sourceString
    };
  },
  test(_1, _2, _3, textblock, _4) {
    return {
      test: textblock.sourceString
    };;
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
