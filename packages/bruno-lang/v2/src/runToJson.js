const ohm = require('ohm-js');
const _ = require('lodash');
const { outdentString } = require('../../v1/src/utils');

const grammar = ohm.grammar(`Bru {
  BruFile = (meta | vars | requests)*

  nl = "\\r"? "\\n"
  st = " " | "\\t"
  stnl = st | nl
  tagend = nl "}"
  optionalnl = ~tagend nl
  keychar = ~(tagend | st | nl | ":") any
  valuechar = ~(nl | tagend) any

  // Text Blocks
  textblock = textline (~tagend nl textline)*
  textline = textchar*
  textchar = ~nl any

   // Multiline text block surrounded by '''
  multilinetextblockdelimiter = "'''"
  multilinetextblock = multilinetextblockdelimiter (~multilinetextblockdelimiter any)* multilinetextblockdelimiter

  // Dictionary Blocks
  dictionary = st* "{" pairlist? tagend
  pairlist = optionalnl* pair (~tagend stnl* pair)* (~tagend space)*
  pair = st* key st* ":" st* value st*
  key = keychar*
  value = multilinetextblock | valuechar*
  
  // Dictionary for Assert Block
  assertdictionary = st* "{" assertpairlist? tagend
  assertpairlist = optionalnl* assertpair (~tagend stnl* assertpair)* (~tagend space)*
  assertpair = st* assertkey st* ":" st* value st*
  assertkey = ~tagend assertkeychar*
  assertkeychar = ~(tagend | nl | ":") any

// Array Blocks
  array = st* "[" stnl* valuelist stnl* "]"
  valuelist = stnl* arrayvalue stnl* ("," stnl* arrayvalue)*
  arrayvalue = arrayvaluechar*
  arrayvaluechar = ~(nl | st | "[" | "]" | ",") any

  meta = "meta" dictionary
  vars = "vars" dictionary

  requests = "requests" array
}`);

const mapPairListToKeyValPair = (pairList = []) => {
  if (!pairList || !pairList.length) {
    return {};
  }

  return _.merge({}, ...pairList[0]);
};

const mapPairListToKeyValPairs = (pairList = []) => {
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
    BruFile(tags) {
        if (!tags || !tags.ast || !tags.ast.length) {
            return {
                variables: [],
                requests: [],
            };
        }

        return _.reduce(
            tags.ast,
            (result, item) => {
                return _.mergeWith(result, item, concatArrays)
            }
        )
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
    array(_1, _2, _3, valuelist, _4, _5) {
        return valuelist.ast;
      },
    arrayvalue(chars) {
        return chars.sourceString ? chars.sourceString.trim() : '';
    },
    valuelist(_1, value, _2, _3, _4, rest) {
        return [value.ast, ...rest.ast];
    },
    key(chars) {
        return chars.sourceString ? chars.sourceString.trim() : '';
    },
    value(chars) {
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
    _iter(...elements) {
        return elements.map((e) => e.ast);
    },
    meta(_1, dictionary) {
        let meta = mapPairListToKeyValPair(dictionary.ast);

        if (!meta.seq) {
            meta.seq = 1;
        }

        return {
            meta
        };
    },
    requests(_1, array) {
        const requests =array.ast;
        return {
            requests: requests.map(r => ({"request": r}))
        };
    },
    vars(_1, dictionary) {
        const vars = mapPairListToKeyValPairs(dictionary.ast);
        _.each(vars, (v) => {
            v.secret = false;
        });
        return {
            vars: vars
        };
    },

});


const parser = (input) => {
    const match = grammar.match(input)

    if (match.succeeded()) {
        const obj = sem(match).ast;

        return {
            uid: "",
            name: obj.meta.name,
            seq: obj.meta.seq,
            requests: obj.requests,
            vars: obj.vars,
            environment: null,
        };
    } else {
        throw new Error(match.message);
    }
}


module.exports = parser;

