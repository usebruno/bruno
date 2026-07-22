const ohm = require('ohm-js');
const _ = require('lodash');
const { safeParseJson, outdentString } = require('../../utils');
const astBaseAttribute = require('../../common/attributes');
const {
  mapPairListToKeyValPairs,
  mapRequestParams,
  mapPairListToKeyValPairsMultipart,
  mapPairListToKeyValPairsFile,
  concatArrays
} = require('../../common/semantic-utils');

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
  multilinetextblock = multilinetextblockdelimiter (~multilinetextblockdelimiter any)* multilinetextblockdelimiter st* contenttypeannotation?
  contenttypeannotation = "@contentType(" (~")" any)* ")"

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
  value = list | multilinetextblock | singlelinevalue
  singlelinevalue = valuechar*

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
    // Return body with the mode set
    return {
      body: {
        mode: modeValue || 'none'
      }
    };
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

const grammarSemantics = requestGrammar.createSemantics();
grammarSemantics.addAttribute('ast', { ...astBaseAttribute, ...astRequestAttribute });

const parseRequest = (input) => {
  const match = requestGrammar.match(input);

  if (match.succeeded()) {
    let ast = grammarSemantics(match).ast;
    return ast;
  } else {
    console.log('match failed', match);
    throw new Error(match.message);
  }
};

module.exports = parseRequest;
