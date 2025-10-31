const ohm = require('ohm-js');
const _ = require('lodash');
const { safeParseJson, outdentString } = require('../utils');
const parseRequest = require('./request/bruToJson');
const parseResponse = require('./response/bruToJson');
const astBaseAttribute = require('./commons/astBaseAttribute');

/**
 * Example Grammar for Bruno
 *
 * Examples follow a simplified grammar with root-level properties and proper colon syntax.
 * No meta block - everything is at root level: name, description, type, url, etc.
 * Supports all body types from request side but response body stays as simple text.
 */
const exampleGrammar = ohm.grammar(`Example {
  ExampleFile = (name | description | request | response)*
  
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
  value = multilinetextblock | valuechar*

  // List
  list = st* "[" nl+ listitems? st* nl+ st* "]"
  listitems = listitem (nl+ listitem)*
  listitem = st+ (alnum | "_" | "-")+ st*

  // Text Blocks
  textblock = textline (~tagend nl textline)*
  textline = textchar*
  textchar = ~nl any

  // Root level properties
  name =  "name" st* ":" st* valuechar* st*
  description = "description" st* ":" st* valuechar* st*

  // Request block
  request = nl* "request" st* ":" st* "{" nl* requestcontent+ nl* "}" nl*
  requestcontent = (~tagend any)+

  // Response block
  response =  "response" st* ":" st* "{" nl* responsecontent nl* "}" nl*
  responsecontent = (~tagend any)+
}`);

const astExampleAttribute = {
  ExampleFile(tags) {
    if (!tags || !tags.ast || !tags.ast.length) {
      return {};
    }

    const result = _.reduce(tags.ast, (acc, item) => {
      return _.merge(acc, item);
    }, {});

    return result;
  },
  // Root level properties
  name(_1, _2, _3, _4, value, _6) {
    return {
      name: value.sourceString ? value.sourceString.trim() : ''
    };
  },
  description(_1, _2, _3, _4, value, _6) {
    return {
      description: value.sourceString ? value.sourceString.trim() : ''
    };
  },
  request(_1, _2, _3, _4, _5, _6, _7, requestcontent, _8, _9, _10) {
    if (!requestcontent || !requestcontent.ast || !requestcontent.ast.length) {
      return {};
    }

    const outdentedContent = outdentString(requestcontent.sourceString);
    const parsedRequest = parseRequest(outdentedContent);

    return {
      request: parsedRequest
    };
  },
  requestcontent(chars) {
    return chars.sourceString;
  },
  response(_1, _2, _3, _4, _5, _6, content, _7, _8, _9) {
    const outdentedContent = outdentString(content.sourceString);
    const parsedResponse = parseResponse(outdentedContent);

    return { response: parsedResponse };
  },
  responsecontent(chars) {
    return chars.sourceString;
  }
};

const exampleGrammarSemantics = exampleGrammar.createSemantics();
exampleGrammarSemantics.addAttribute('ast', _.merge({}, astBaseAttribute, astExampleAttribute));

const sem = exampleGrammarSemantics;

const parseExample = (input) => {
  const match = exampleGrammar.match(input);

  if (match.succeeded()) {
    let ast = sem(match).ast;
    return ast;
  } else {
    console.log('match failed', match);
    throw new Error(match.message);
  }
};

module.exports = parseExample;
