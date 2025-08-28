const ohm = require('ohm-js');
const _ = require('lodash');

const grammar = ohm.grammar(`Bru {
  BruEnvFile = (vars | secretvars)*

  nl = "\\r"? "\\n"
  st = " " | "\\t"
  stnl = st | nl
  tagend = nl "}"
  optionalnl = ~tagend nl
  keychar = ~(tagend | st | nl | ":") any
  valuechar = ~(nl | tagend | multilinetextblockdelimiter) any

  multilinetextblockdelimiter = "'''"
  multilinetextblock = multilinetextblockdelimiter (~multilinetextblockdelimiter any)* multilinetextblockdelimiter

  // Dictionary Blocks
  dictionary = st* "{" pairlist? tagend
  pairlist = optionalnl* pair (~tagend stnl* pair)* (~tagend space)*
  pair = st* key st* ":" st* value st*
  key = keychar*
  value = multilinetextblock | valuechar*

  // Array Blocks
  array = st* "[" stnl* valuelist stnl* "]"
  valuelist = stnl* arrayvalue stnl* ("," stnl* arrayvalue)*
  arrayvalue = arrayvaluechar*
  arrayvaluechar = ~(nl | st | "[" | "]" | ",") any

  secretvars = "vars:secret" array
  vars = "vars" dictionary
}`);

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

const mapArrayListToKeyValPairs = (arrayList = []) => {
  arrayList = arrayList.filter((v) => v && v.length);

  if (!arrayList.length) {
    return [];
  }

  return _.map(arrayList, (value) => {
    let name = value;
    let enabled = true;
    if (name && name.length && name.charAt(0) === '~') {
      name = name.slice(1);
      enabled = false;
    }

    return {
      name,
      value: '',
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
    if (!tags || !tags.ast || !tags.ast.length) {
      return {
        variables: []
      };
    }

    return _.reduce(
      tags.ast,
      (result, item) => {
        return _.mergeWith(result, item, concatArrays);
      },
      {}
    );
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
    try {
      let isMultiline = chars.sourceString?.startsWith(`'''`) && chars.sourceString?.endsWith(`'''`);
      if (isMultiline) {
        const multilineString = chars.sourceString?.replace(/^'''|'''$/g, '');
        return multilineString
          .split('\n')
          .map((line, index) => {
            // Remove leading spaces for first and last lines, keep indentation for content lines
            if (index === 0 || index === multilineString.split('\n').length - 1) {
              return line.trim();
            }
            // Remove standard 4-space indentation
            return line.startsWith('    ') ? line.slice(4) : line;
          })
          // Remove empty first/last lines
          .filter(line => line !== '')
          .join('\n');
      }
      return chars.sourceString ? chars.sourceString.trim() : '';
    } catch (err) {
      console.error(err);
    }
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  multilinetextblockdelimiter(_) {
    return '';
  },
  multilinetextblock(_1, content, _2) {
    return content.sourceString.trim();
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
  vars(_1, dictionary) {
    const vars = mapPairListToKeyValPairs(dictionary.ast);
    _.each(vars, (v) => {
      v.secret = false;
    });
    return {
      variables: vars
    };
  },
  secretvars: (_1, array) => {
    const vars = mapArrayListToKeyValPairs(array.ast);
    _.each(vars, (v) => {
      v.secret = true;
    });
    return {
      variables: vars
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
