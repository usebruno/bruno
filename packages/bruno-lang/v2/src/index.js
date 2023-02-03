const ohm = require("ohm-js");
const _ = require('lodash');

const grammar = ohm.grammar(`Bru {
  BruFile = (script | test | headers)*
  nl = "\\r"? "\\n"
  st = " " | "\\t"
  tagend = nl "}"
  
  headers = "headers" st* "{" pairlist? tagend
  
  pairlist = nl* pair (~tagend nl pair)* (~tagend space)*
  pair = st* key st* ":" st* val st*
  key = ~tagend alnum*
  val = ~tagend letter*

  script = "script" st* "{" nl* codeblock tagend
  test = "test" st* "{" codeblock tagend

  codeblock = codeline (~tagend nl codeline)*
  codeline = codechar*
  codechar = ~nl any
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

const sem = grammar.createSemantics().addAttribute('ast', {
  BruFile(tags) {
    if(!tags || !tags.ast || !tags.ast.length) {
      return {};
    }

    return _.reduce(tags.ast, (result, item) => {
      return _.assign(result, item);
    }, {});
  },
  headers(_1, _2, _3, pairlist, _4) {
    return {
      headers: mapPairListToKeyValPairs(pairlist.ast)
    };
  },
  pairlist(_1, pair, _2, rest, _3) {
    return [pair.ast, ...rest.ast];
  },
  pair(_1, key, _2, _3, _4, val, _5) {
    let res = {};
    res[key.ast] = val.ast;
    return res;
  },
  key(chars) {
    return chars.sourceString;
  },
  val(chars) {
    return chars.sourceString;
  },
  script(_1, _2, _3, _4, codeblock, _5) {
    return {
      script: codeblock.sourceString
    };
  },
  test(_1, _2, _3, codeblock, _4) {
    return {
      test: codeblock.sourceString
    };;
  },
  codeblock(line, _1, rest) {
    return [line.ast, ...rest.ast].join('\n');
  },
  codeline(chars) {
    return chars.sourceString;
  },
  codechar(char) {
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
