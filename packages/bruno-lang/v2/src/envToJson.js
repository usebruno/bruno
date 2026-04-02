const ohm = require('ohm-js');
const _ = require('lodash');

// this is done to avoid breaking existing pairlist mapping so
// the key is hidden and not added into the json automatically
const ANNOTATIONS_KEY = Symbol('annotations');

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

  // Annotation support (decorators on pairs)
  annotationname = annotationchar+
  annotationchar = ~("(" | ")" | " " | "\\t" | "\\r" | "\\n" | ":") any
  annotationsinglequotedargchar = ~"'" any
  annotationsinglequotedarg = "'" annotationsinglequotedargchar* "'"
  annotationdoublequotedargchar = ~"\\"" any
  annotationdoublequotedarg = "\\"" annotationdoublequotedargchar* "\\""
  annotationunquotedargchar = ~")" any
  annotationunquotedarg = annotationunquotedargchar*
  annotationargvalue = annotationsinglequotedarg | annotationdoublequotedarg | annotationunquotedarg
  annotationmultilinetextblock = multilinetextblockdelimiter (~multilinetextblockdelimiter any)* multilinetextblockdelimiter
  annotationargscontents = annotationmultilinetextblock | annotationargvalue
  annotationargs = "(" annotationargscontents ")"
  annotation = "@" annotationname annotationargs?
  annotationentry = st* annotation ~":" st* nl
  pairannotations = annotationentry*

  // Dictionary Blocks
  dictionary = st* "{" pairlist? tagend
  pairlist = optionalnl* pair (~tagend stnl* pair)* (~tagend space)*
  pair = st* pairannotations st* key st* ":" st* value st*
  key = keychar*
  value = multilinetextblock | valuechar*

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
    let name = _.keys(pair)[0];
    let value = pair[name];
    const rawAnnotations = pair[ANNOTATIONS_KEY];
    let enabled = true;
    if (name && name.length && name.charAt(0) === '~') {
      name = name.slice(1);
      enabled = false;
    }

    const result = { name, value, enabled };
    if (rawAnnotations && rawAnnotations.length) {
      result.annotations = rawAnnotations;
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
  pairannotations(entries) {
    return entries.ast;
  },
  annotationentry(_1, annotation, _2, _3) {
    return annotation.ast;
  },
  annotation(_at, name, argsIter) {
    const annotObj = { name: name.ast };
    const argsArr = argsIter.ast;
    if (argsArr.length > 0) {
      annotObj.value = argsArr[0];
    }
    return annotObj;
  },
  annotationname(chars) {
    return chars.sourceString;
  },
  annotationsinglequotedarg(_open, chars, _close) {
    return chars.sourceString;
  },
  annotationdoublequotedarg(_open, chars, _close) {
    return chars.sourceString;
  },
  annotationunquotedarg(chars) {
    return chars.sourceString;
  },
  annotationargvalue(alt) {
    return alt.ast;
  },
  annotationmultilinetextblock(_1, content, _2) {
    const lines = content.sourceString.split('\n');
    let minIndent = 4;
    const dedented = lines.map((line) => (line.trim() === '' ? '' : line.substring(minIndent)));
    if (dedented.length > 0 && dedented[0] === '') dedented.shift();
    if (dedented.length > 0 && dedented[dedented.length - 1] === '') dedented.pop();
    return dedented.join('\n');
  },
  annotationargscontents(alt) {
    return alt.ast;
  },
  annotationargs(_open, value, _close) {
    return value.ast;
  },
  pair(_1, annotations, _2, key, _3, _4, _5, value, _6) {
    let res = {};
    res[key.ast] = value.ast ? value.ast.trim() : '';
    const annotationList = annotations.ast;
    if (annotationList && annotationList.length > 0) {
      res[ANNOTATIONS_KEY] = annotationList;
    }
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
