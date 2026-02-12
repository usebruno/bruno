const ohm = require('ohm-js');
const _ = require('lodash');

// Env files use 4-space indentation for multiline content
// vars {
//   API_KEY: '''
//     -----BEGIN PUBLIC KEY-----
//     MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8
//     HMR5LXFFrwXQFE6xUVhXrxUpx1TtfoGkRcU7LEWV
//     -----END PUBLIC KEY-----
//   '''
// }
const indentLevel = 4;
const grammar = ohm.grammar(`Bru {
  BruEnvFile = (vars | secretvars | color)*

  nl = "\\r"? "\\n"
  st = " " | "\\t"
  stnl = st | nl
  tagend = nl "}"
  optionalnl = ~tagend nl
  keychar = ~(tagend | st | nl | ":") any
  valuechar = ~(nl | tagend | multilinetextblockstart) any

  multilinetextblockdelimiter = "'''"
  multilinetextblockstart = "'''" nl
  multilinetextblockend = nl st* "'''"
  multilinetextblock = multilinetextblockstart multilinetextblockcontent multilinetextblockend
  multilinetextblockcontent = (~multilinetextblockend any)*

  // Dictionary Blocks
  dictionary = st* "{" pairlist? tagend
  pairlist = optionalnl* pair (~tagend stnl* pair)* (~tagend space)*
  pair = st* key st* ":" st* value st*
  key = keychar*
  value = multilinetextblock | singlelinevalue_optdesc
  singlelinevalue_optdesc = valuechar_before_desc* (st* "@" "description" "(" "'''" descriptionTripleContent "'''" ")" st*)?
  valuechar_before_desc = ~(st* "@" "description" "(" "'''") valuechar
  descriptionTripleContent = (~"'''" any)*

  // Array Blocks
  array = st* "[" stnl* valuelist stnl* "]"
  valuelist = stnl* arrayvalue stnl* ("," stnl* arrayvalue)*
  arrayvalue = arrayvaluechar*
  arrayvaluechar = ~(nl | st | "[" | "]" | ",") any

  secretvars = "vars:secret" array
  vars = "vars" dictionary
  color = "color:" any*
}`);

const extractDescription = (pair) => {
  if (!_.isString(pair.value)) {
    return;
  }
  // Handle triple-quoted description: @description('''...''')
  const tripleMatch = pair.value.match(/\s*@description\('''([\s\S]*?)'''\)\s*$/);
  if (tripleMatch) {
    const raw = tripleMatch[1]; // everything between the ''' delimiters

    if (raw.includes('\n')) {
      // Multiline: stringify added 4 spaces of indentation to each content line,
      // so strip them back to recover the original description text.
      pair.description = raw
        .split('\n')
        .map((line) => (line.startsWith('    ') ? line.slice(4) : line))
        .join('\n')
        .trim();
    } else {
      // Single-line inline: @description('''some text''') — no indentation to strip.
      pair.description = raw.trim();
    }

    // Remove the @description(...) suffix from the value, leaving just the actual value.
    pair.value = pair.value.slice(0, -tripleMatch[0].length).trim();
    return;
  }

  // Handle double-quoted description: @description("...") — supports backslash escapes (e.g. \", \n)
  const doubleMatch = pair.value.match(/\s*@description\("((?:\\.|[^"\\])*)"\)\s*$/);
  if (doubleMatch) {
    let decoded;
    try {
      // Use JSON.parse to correctly unescape sequences like \n, \t, \"
      decoded = JSON.parse('"' + doubleMatch[1] + '"');
    } catch {
      // Fallback if JSON.parse fails: only unescape literal \"
      decoded = doubleMatch[1].replace(/\\"/g, '"');
    }
    pair.description = decoded.trim();

    // Remove the @description(...) suffix from the value.
    pair.value = pair.value.slice(0, -doubleMatch[0].length).trim();
    return;
  }
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

    const result = {
      name,
      value,
      enabled
    };
    extractDescription(result);
    return result;
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
    // .ctorName provides the name of the rule that matched the input
    if (chars.ctorName === 'multilinetextblock') {
      return chars.ast;
    }
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  multilinetextblockstart(_1, _2) {
    return '';
  },
  multilinetextblockend(_1, _2, _3) {
    return '';
  },
  multilinetextblockdelimiter(_) {
    return '';
  },
  multilinetextblock(_1, content, _2) {
    return content.ast
      .split(/\r\n|\r|\n/)
      .map((line) => line.slice(indentLevel)) // Remove 4-space indentation
      .join('\n')
      .trim();
  },
  multilinetextblockcontent(chars) {
    return chars.sourceString;
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
  },
  color: (_1, anystring) => {
    return {
      color: anystring.sourceString.trim()
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
