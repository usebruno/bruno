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
  pair = descriptionprefix? st* key st* ":" st* value st*  -- kv
       | descriptionprefix                                  -- orphandesc
  key = keychar*
  value = multilinetextblock | singlelinevalue
  singlelinevalue = valuechar*
  descriptionTripleContent = (~"'''" any)*

  // Prefix description annotation: @description('''...''') on its own line before a key:value pair.
  // Supports multiline values (unlike the suffix form).
  // Double-quoted form is used when the description itself contains ''' (cannot embed inside triple-quoted).
  descriptionprefix = descriptionprefix_triple | descriptionprefix_double
  descriptionprefix_triple = st* "@" "description" "(" "'''" descriptionTripleContent "'''" ")" st* nl
  descriptionprefix_double = st* "@" "description" "(" "\\"" descriptionDoubleChar* "\\"" ")" st* nl
  descriptionDoubleChar = descriptionDoubleEsc | descriptionDoubleNorm
  descriptionDoubleEsc = "\\\\" any
  descriptionDoubleNorm = ~"\\"" ~nl any

  // Array Blocks
  array = st* "[" stnl* valuelist stnl* "]"
  valuelist = stnl* arrayvalue stnl* ("," stnl* arrayvalue)*
  arrayvalue = arrayvaluechar*
  arrayvaluechar = ~(nl | st | "[" | "]" | ",") any

  secretvars = "vars:secret" array
  vars = "vars" dictionary
  color = "color:" any*
}`);

const mapPairListToKeyValPairs = (pairList = []) => {
  if (!pairList.length) {
    return [];
  }

  return _.map(pairList[0], (pair) => {
    // Skip the internal __desc marker when resolving the real key name
    let name = _.keys(pair).find((k) => k !== '__desc');
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

    if (pair.__desc !== undefined) {
      result.description = pair.__desc;
    }

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
  descriptionprefix(alt) {
    return alt.ast;
  },
  descriptionprefix_triple(_st, _at, _desc, _lp, _open, descContent, _close, _rp, _st2, _nl) {
    const raw = descContent.sourceString;
    if (raw.includes('\n')) {
      return raw.split('\n').map((line) => (line.startsWith('    ') ? line.slice(4) : line)).join('\n').trim();
    }
    return raw.trim();
  },
  descriptionprefix_double(_st, _at, _desc, _lp, _dqOpen, descChars, _dqClose, _rp, _st2, _nl) {
    return descChars.sourceString.replace(/\\(\\|"|n|r|t)/g, (_, c) => {
      if (c === '\\') return '\\';
      if (c === '"') return '"';
      if (c === 'n') return '\n';
      if (c === 'r') return '\r';
      if (c === 't') return '\t';
      return c;
    });
  },
  pair_kv(descPrefix, _1, key, _2, _3, _4, value, _5) {
    let res = {};
    const valueAst = value.ast;
    const prefixDesc = descPrefix.children.length > 0 ? descPrefix.children[0].ast : undefined;
    res[key.ast] = valueAst ? valueAst.trim() : '';
    if (prefixDesc !== undefined) res.__desc = prefixDesc;
    return res;
  },
  pair_orphandesc(descPrefix) {
    return { '': '', '__desc': descPrefix.ast };
  },
  key(chars) {
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  value(chars) {
    return chars.ast;
  },
  singlelinevalue(chars) {
    return chars.sourceString?.trim() || '';
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
