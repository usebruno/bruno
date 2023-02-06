const ohm = require("ohm-js");
const _ = require('lodash');

const grammar = ohm.grammar(`Bru {
  BruEnvFile = (vars)*

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

  vars = "vars" dictionary
}`);

const mapPairListToKeyValPairs = (pairList = []) => {
  if(!pairList.length) {
    return [];
  }

  return _.map(pairList[0], pair => {
    let name = _.keys(pair)[0];
    let value = pair[name];
    let enabled = true;
    if (name && name.length && name.charAt(0) === "~") {
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

const sem = grammar.createSemantics().addAttribute('ast', {
  BruEnvFile(tags) {
    if(!tags || !tags.ast || !tags.ast.length) {
      return {
        variables: []
      };
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
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  value(chars) {
    return chars.sourceString ? chars.sourceString.trim() : '';
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
  },
  vars(_1, dictionary) {
    const vars = mapPairListToKeyValPairs(dictionary.ast);
    return {
      variables: vars
    };
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
