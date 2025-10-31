const ohm = require('ohm-js');
const _ = require('lodash');
const { safeParseJson, outdentString } = require('../../utils');
const astBaseAttribute = require('../commons/astBaseAttribute');

/**
 * Request Block Grammar for Bruno Examples
 *
 * Handles parsing of request blocks within example files.
 * Supports all body types: json, text, xml, sparql, graphql, form-urlencoded, multipart-form, file
 */
const requestGrammar = ohm.grammar(`Request {
  RequestFile = requestcontent*
  
  nl = "\\r"? "\\n"
  st = " " | "\\t"
  stnl = st | nl
  tagend = nl "}"
  optionalnl = ~tagend nl
  keychar = ~(tagend | st | nl | ":") any
  valuechar = ~(nl | tagend) any

  // Multiline text block surrounded by '''
  multilinetextblockdelimiter = "'''"
  multilinetextblock = multilinetextblockdelimiter (~multilinetextblockdelimiter any)* multilinetextblockdelimiter

  // Dictionary Blocks
  dictionary = st* "{" pairlist? tagend
  pairlist = optionalnl* pair (~tagend nl pair)*
  pair = st* (quoted_key | key) st* ":" st* value st*
  disable_char = "~"
  quote_char = "\\""
  esc_char = "\\\\"
  esc_quote_char = esc_char quote_char
  quoted_key_char = ~(quote_char | esc_quote_char | nl) any
  quoted_key = disable_char? quote_char (esc_quote_char | quoted_key_char)* quote_char
  key = keychar*
  value = list | multilinetextblock | valuechar*

  // List
  list = st* "[" nl+ listitems? st* nl+ st* "]"
  listitems = listitem (nl+ listitem)*
  listitem = st+ (alnum | "_" | "-")+ st*

  // Text Blocks
  textblock = textline (~tagend nl textline)*
  textline = textchar*
  textchar = ~nl any

  // Request content
  requestcontent = requesturl | requestmethod | requestmode | requestparamspath | requestparamsquery | requestheaders | requestbodies
  requesturl = "url" st* ":" st* valuechar*
  requestmethod = "method" st* ":" st* valuechar*
  requestmode = "mode" st* ":" st* valuechar*
  requestparamspath = "params:path" st* ":" st* dictionary
  requestparamsquery = "params:query" st* ":" st* dictionary
  requestheaders = "headers" st* ":" st* dictionary
  requestbodies = bodyjson | bodytext | bodyxml | bodysparql | bodygraphql | bodygraphqlvars | bodyformurlencoded | bodymultipart | bodyfile

  // All body types from request side
  bodyjson = "body:json" st* ":" st* "{" nl* textblock tagend
  bodytext = "body:text" st* ":" st* "{" nl* textblock tagend
  bodyxml = "body:xml" st* ":" st* "{" nl* textblock tagend
  bodysparql = "body:sparql" st* ":" st* "{" nl* textblock tagend
  bodygraphql = "body:graphql" st* ":" st* "{" nl* textblock tagend
  bodygraphqlvars = "body:graphql:vars" st* ":" st* "{" nl* textblock tagend
  bodyformurlencoded = "body:form-urlencoded" st* ":" st* dictionary
  bodymultipart = "body:multipart-form" st* ":" st* dictionary
  bodyfile = "body:file" st* ":" st* dictionary
}`);

const mapPairListToKeyValPairs = (pairList = [], parseEnabled = true) => {
  if (!pairList.length) {
    return [];
  }
  return _.map(pairList[0], (pair) => {
    let name = _.keys(pair)[0];
    let value = pair[name];

    if (!parseEnabled) {
      return {
        name,
        value
      };
    }

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

const mapRequestParams = (pairList = [], type) => {
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
      enabled,
      type
    };
  });
};

// Helper functions for multipart and file handling
const multipartExtractContentType = (pair) => {
  if (_.isString(pair.value)) {
    const match = pair.value.match(/^(.*?)\s*@contentType\((.*?)\)\s*$/);
    if (match != null && match.length > 2) {
      pair.value = match[1];
      pair.contentType = match[2];
    } else {
      pair.contentType = '';
    }
  }
};

const fileExtractContentType = (pair) => {
  if (_.isString(pair.value)) {
    const match = pair.value.match(/^(.*?)\s*@contentType\((.*?)\)\s*$/);
    if (match && match.length > 2) {
      pair.value = match[1].trim();
      pair.contentType = match[2].trim();
    } else {
      pair.contentType = '';
    }
  }
};

const mapPairListToKeyValPairsMultipart = (pairList = [], parseEnabled = true) => {
  const pairs = mapPairListToKeyValPairs(pairList, parseEnabled);

  return pairs.map((pair) => {
    pair.type = 'text';
    multipartExtractContentType(pair);

    if (pair.value.startsWith('@file(') && pair.value.endsWith(')')) {
      let filestr = pair.value.replace(/^@file\(/, '').replace(/\)$/, '');
      pair.type = 'file';
      pair.value = filestr.split('|');
    }

    return pair;
  });
};

const mapPairListToKeyValPairsFile = (pairList = [], parseEnabled = true) => {
  const pairs = mapPairListToKeyValPairs(pairList, parseEnabled);
  return pairs.map((pair) => {
    fileExtractContentType(pair);

    if (pair.value.startsWith('@file(') && pair.value.endsWith(')')) {
      let filePath = pair.value.replace(/^@file\(/, '').replace(/\)$/, '');
      pair.filePath = filePath;
      pair.selected = pair.enabled;

      // Remove pair.value as it only contains the file path reference
      delete pair.value;
      // Remove pair.name as it is auto-generated (e.g., file1, file2, file3, etc.)
      delete pair.name;
      delete pair.enabled;
    }

    return pair;
  });
};

const concatArrays = (objValue, srcValue) => {
  if (_.isArray(objValue) && _.isArray(srcValue)) {
    return objValue.concat(srcValue);
  }
};

const astRequestAttribute = {
  RequestFile(tags) {
    if (!tags || !tags.ast || !tags.ast.length) {
      return {};
    }

    return _.reduce(tags.ast,
      (result, item) => {
        return _.mergeWith(result, item, concatArrays);
      },
      {});
  },
  requesturl(_1, _2, _3, _4, value) {
    return {
      url: value.sourceString ? value.sourceString.trim() : ''
    };
  },
  requestmethod(_1, _2, _3, _4, value) {
    return {
      method: value.sourceString ? value.sourceString.trim() : ''
    };
  },
  requestmode(_1, _2, _3, _4, value) {
    const modeValue = value.sourceString ? value.sourceString.trim() : '';
    // If mode is "none", return a body with mode: "none"
    if (modeValue === 'none') {
      return {
        body: {
          mode: 'none'
        }
      };
    }
    // For other modes, return nothing since the body parser will handle it
    return {};
  },
  requestparamspath(_1, _2, _3, _4, dictionary) {
    return {
      params: mapRequestParams(dictionary.ast, 'path')
    };
  },
  requestparamsquery(_1, _2, _3, _4, dictionary) {
    return {
      params: mapRequestParams(dictionary.ast, 'query')
    };
  },
  requestheaders(_1, _2, _3, _4, dictionary) {
    return {
      headers: mapPairListToKeyValPairs(dictionary.ast)
    };
  },

  // All body types from request side
  bodyjson(_1, _2, _3, _4, _5, _6, textblock, _8) {
    return {
      body: {
        mode: 'json',
        json: outdentString(textblock.sourceString)
      }
    };
  },
  bodytext(_1, _2, _3, _4, _5, _6, textblock, _8) {
    return {
      body: {
        mode: 'text',
        text: outdentString(textblock.sourceString)
      }
    };
  },
  bodyxml(_1, _2, _3, _4, _5, _6, textblock, _8) {
    return {
      body: {
        mode: 'xml',
        xml: outdentString(textblock.sourceString)
      }
    };
  },
  bodysparql(_1, _2, _3, _4, _5, _6, textblock, _8) {
    return {
      body: {
        mode: 'sparql',
        sparql: outdentString(textblock.sourceString)
      }
    };
  },
  bodygraphql(_1, _2, _3, _4, _5, _6, textblock, _8) {
    return {
      body: {
        mode: 'graphql',
        graphql: {
          query: outdentString(textblock.sourceString)
        }
      }
    };
  },
  bodygraphqlvars(_1, _2, _3, _4, _5, _6, textblock, _8) {
    return {
      body: {
        mode: 'graphql',
        graphql: {
          variables: outdentString(textblock.sourceString)
        }
      }
    };
  },
  bodyformurlencoded(_1, _2, _3, _4, dictionary) {
    return {
      body: {
        mode: 'formUrlEncoded',
        formUrlEncoded: mapPairListToKeyValPairs(dictionary.ast)
      }
    };
  },
  bodymultipart(_1, _2, _3, _4, dictionary) {
    return {
      body: {
        mode: 'multipartForm',
        multipartForm: mapPairListToKeyValPairsMultipart(dictionary.ast)
      }
    };
  },
  bodyfile(_1, _2, _3, _4, dictionary) {
    return {
      body: {
        mode: 'file',
        file: mapPairListToKeyValPairsFile(dictionary.ast)
      }
    };
  }
};

const requestGrammarSemantics = requestGrammar.createSemantics();
requestGrammarSemantics.addAttribute('ast', _.merge({}, astBaseAttribute, astRequestAttribute));

const sem = requestGrammarSemantics;

const parseRequest = (input) => {
  const match = requestGrammar.match(input);

  if (match.succeeded()) {
    let ast = sem(match).ast;
    return ast;
  } else {
    console.log('match failed', match);
    throw new Error(match.message);
  }
};

module.exports = parseRequest;
