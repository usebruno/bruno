const ohm = require("ohm-js");
const _ = require('lodash');

const grammar = ohm.grammar(`Bru {
  BruFile = (script | test | headers)*
  nl = "\\r"? "\\n"
  st = " " | "\\t"
  tagend = nl "}"
  validkey = ~(st | ":") any
  validvalue = ~nl any

  headers = "headers" st* "{" pairlist? tagend

  pairlist = nl* pair (~tagend nl pair)* (~tagend space)*
  pair = st* key st* ":" st* value? st*
  key = ~tagend validkey*
  value = ~tagend validvalue*

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
