const ohm = require('ohm-js');
const _ = require('lodash');
const { safeParseJson, outdentString } = require('./utils');

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
  tagend = nl st* "}"
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

  // Text Blocks
  textblock = textline (~tagend nl textline)*
  textline = textchar*
  textchar = ~nl any
  
  // Body block with brace matching
  bodyblock = "{" nl* bodycontent* nl* "}"
  bodycontent = bodyblock | ~("{" | "}") any

  // Root level properties
  name = "name" st* ":" st* valuechar* st*
  description = "description" st* ":" st* valuechar* st*

  // Request block
  request = nl* "request" st* ":" st* "{" nl* requestcontent nl* "}"
  requestcontent = (stnl* (requesturl | requestmethod | requestmode | requestparamspath | requestparamsquery | requestheaders | requestbodies))*
  requesturl = "url" st* ":" st* valuechar* stnl*
  requestmethod = "method" st* ":" st* valuechar* stnl*
  requestmode = "mode" st* ":" st* valuechar* stnl*
  requestbody = "body" st* ":" st* "{" nl* textblock tagend
  requestparamspath = "params:path" st* ":" st* dictionary
  requestparamsquery = "params:query" st* ":" st* dictionary
  requestheaders = "headers" st* ":" st* dictionary
  requestbodies = (bodyjson | bodytext | bodyxml | bodysparql | bodygraphql | bodygraphqlvars | bodyformurlencoded | bodymultipart | bodyfile)

  // All body types from request side
  bodyjson = "body:json" st* ":" st* bodyblock
  bodytext = "body:text" st* ":" st* bodyblock
  bodyxml = "body:xml" st* ":" st* bodyblock
  bodysparql = "body:sparql" st* ":" st* bodyblock
  bodygraphql = "body:graphql" st* ":" st* bodyblock
  bodygraphqlvars = "body:graphql:vars" st* ":" st* bodyblock
  bodyformurlencoded = "body:form-urlencoded" st* ":" st* dictionary
  bodymultipart = "body:multipart-form" st* ":" st* dictionary
  bodyfile = "body:file" st* ":" st* dictionary

  // Response block
  response = nl* "response" st* ":" st* "{" nl* responsecontent nl* "}"
  responsecontent = (stnl* (responseheaders | responsestatus | responsebody))*
  responseheaders = "headers" st* ":" st* dictionary
  responsestatus = "status" st* ":" st* dictionary
  responsebody = "body" st* ":" st* dictionary
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

const mapPairListToKeyValPair = (pairList = []) => {
  if (!pairList || !pairList.length) {
    return {};
  }

  return _.merge({}, ...pairList[0]);
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

const sem = exampleGrammar.createSemantics().addAttribute('ast', {
  ExampleFile(tags) {
    if (!tags || !tags.ast || !tags.ast.length) {
      return {};
    }

    const result = _.reduce(tags.ast, (acc, item) => {
      return _.merge(acc, item);
    }, {});

    return result;
  },
  dictionary(_1, _2, pairlist, _3) {
    return pairlist.ast;
  },
  pairlist(_1, pair, _2, rest) {
    return [pair.ast, ...rest.ast];
  },
  pair(_1, key, _2, _3, _4, value, _5) {
    let res = {};
    res[key.ast] = value.ast ? value.ast.trim() : '';
    return res;
  },
  esc_quote_char(_1, quote) {
    return quote.sourceString;
  },
  quoted_key(disabled, _1, chars, _2) {
    return (disabled ? disabled.sourceString : '') + chars.ast.join('');
  },
  key(chars) {
    return chars.sourceString ? chars.sourceString.trim() : '';
  },
  value(chars) {
    try {
      let isMultiline = chars.sourceString?.startsWith('```') && chars.sourceString?.endsWith('```');
      if (isMultiline) {
        const multilineString = chars.sourceString?.replace(/^```|```$/g, '');
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
  textblock(line, _1, rest) {
    return [line.ast, ...rest.ast].join('\n');
  },
  textline(chars) {
    return chars.sourceString;
  },
  textchar(char) {
    return char.sourceString;
  },
  bodyblock(_1, _2, content, _3, _4) {
    // Return the inner content (without the outer braces and surrounding whitespace)
    // Use the sourceString of the entire bodyblock and extract the inner content
    const fullContent = this.sourceString;
    // Find the first { and last } to extract the inner content
    const firstBrace = fullContent.indexOf('{');
    const lastBrace = fullContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      let innerContent = fullContent.substring(firstBrace + 1, lastBrace);
      // Remove leading and trailing whitespace/newlines
      innerContent = innerContent.replace(/^\s+/, '').replace(/\s+$/, '');
      return innerContent;
    }
    return fullContent;
  },
  bodycontent(char) {
    return char.sourceString;
  },
  nl(_1, _2) {
    return '';
  },
  st(_) {
    return '';
  },
  tagend(_1, _2, _3) {
    return '';
  },
  _terminal() {
    return this.sourceString;
  },
  multilinetextblockdelimiter(_) {
    return '';
  },
  multilinetextblock(_1, content, _2) {
    return content.sourceString.trim();
  },
  _iter(...elements) {
    return elements.map((e) => e.ast);
  },

  // Root level properties
  name(_1, _2, _3, _4, value, _5) {
    return {
      name: value.sourceString ? value.sourceString.trim() : ''
    };
  },
  description(_1, _2, _3, _4, value, _5) {
    return {
      description: value.sourceString ? value.sourceString.trim() : ''
    };
  },

  // Request block
  request(_1, _2, _3, _4, _5, _6, _7, content, _8, _9) {
    return { request: content.ast };
  },
  requestcontent(_1, tags) {
    if (!tags || !tags.ast || !tags.ast.length) {
      return {};
    }
    // Filter out empty items and merge the results
    const validItems = tags.ast.filter((item) => item && Object.keys(item).length > 0);

    const result = _.reduce(validItems, (acc, item) => {
      // Special handling for params to combine arrays instead of overwriting
      if (item.params && acc.params) {
        return {
          ...acc,
          ...item,
          params: [...acc.params, ...item.params]
        };
      }

      // Store mode separately if it exists
      if (item.mode) {
        acc._mode = item.mode;
        return acc;
      }

      return _.merge(acc, item);
    }, {});

    // Body-related fields (json, text, xml, etc.) go into body object
    const bodyFields = ['json', 'text', 'xml', 'sparql', 'graphql', 'formUrlEncoded', 'multipartForm', 'file'];
    const bodyContent = {};

    bodyFields.forEach((field) => {
      if (result[field]) {
        if (field === 'graphql') {
          bodyContent.graphql = result[field];
        } else {
          bodyContent[field] = result[field];
        }
      }
    });

    // If we have body content, wrap it in a body object
    if (Object.keys(bodyContent).length > 0) {
      result.body = bodyContent;

      // Clean up the individual body fields from the result
      bodyFields.forEach((field) => {
        delete result[field];
      });
    }

    // Merge mode into body if it exists
    if (result._mode) {
      if (!result.body) {
        result.body = {};
      }
      result.body.mode = result._mode;
      delete result._mode;
    }

    // Reorder properties to maintain consistent order: url, method, mode, params, headers, body
    const orderedResult = {};
    if (result.url !== undefined) orderedResult.url = result.url;
    if (result.method !== undefined) orderedResult.method = result.method;
    if (result.params && result.params.length > 0) orderedResult.params = result.params;
    if (result.headers !== undefined) orderedResult.headers = result.headers;
    if (result.body !== undefined) orderedResult.body = result.body;

    return orderedResult;
  },
  requesturl(_1, _2, _3, _4, value, _5) {
    return { url: value.sourceString ? value.sourceString.trim() : '' };
  },
  requestmethod(_1, _2, _3, _4, value, _5) {
    return { method: value.sourceString ? value.sourceString.trim() : '' };
  },
  requestmode(_1, _2, _3, _4, value, _5) {
    return { mode: value.sourceString ? value.sourceString.trim() : '' };
  },
  requestbody(_1, _2, _3, _4, _5, _6, textblock, _7) {
    return { body: outdentString(textblock.sourceString) };
  },
  requestparamspath(_1, _2, _3, _4, dictionary) {
    return { params: mapRequestParams(dictionary.ast, 'path') };
  },
  requestparamsquery(_1, _2, _3, _4, dictionary) {
    return { params: mapRequestParams(dictionary.ast, 'query') };
  },
  requestheaders(_1, _2, _3, _4, dictionary) {
    return { headers: mapPairListToKeyValPairs(dictionary.ast) };
  },
  requestbodies(body) {
    return body.ast;
  },

  // Response block
  response(_1, _2, _3, _4, _5, _6, _7, content, _8, _9) {
    return { response: content.ast };
  },
  responsecontent(_1, tags) {
    if (!tags || !tags.ast || !tags.ast.length) {
      return {};
    }
    // Filter out empty items and merge the results
    const validItems = tags.ast.filter((item) => item && Object.keys(item).length > 0);
    return _.reduce(validItems, (result, item) => {
      return _.merge(result, item);
    }, {});
  },
  responseheaders(_1, _2, _3, _4, dictionary) {
    return { headers: mapPairListToKeyValPairs(dictionary.ast) };
  },
  responsestatus(_1, _2, _3, _4, dictionary) {
    const statusPairs = mapPairListToKeyValPairs(dictionary.ast, false);
    return {
      status: statusPairs.find((p) => p.name === 'code')?.value || 200,
      statusText: statusPairs.find((p) => p.name === 'text')?.value || 'OK'
    };
  },
  responsebody(_1, _2, _3, _4, dictionary) {
    const keyValPairs = mapPairListToKeyValPairs(dictionary.ast);
    console.log('keyValPairs', keyValPairs);
    const type = keyValPairs.find((p) => p.name === 'type')?.value;
    const content = keyValPairs.find((p) => p.name === 'content')?.value;
    const contentString = outdentString(content.replace(/^'''|'''$/g, ''), 6).trim();

    return {
      body: {
        type,
        content: contentString
      }
    };
  },

  // All body types from request side
  bodyjson(_1, _2, _3, _4, bodyblock) {
    return {
      json: outdentString(bodyblock.ast, 4)
    };
  },
  bodytext(_1, _2, _3, _4, bodyblock) {
    return {
      text: outdentString(bodyblock.ast, 4)
    };
  },
  bodyxml(_1, _2, _3, _4, bodyblock) {
    return {
      xml: outdentString(bodyblock.ast, 4)
    };
  },
  bodysparql(_1, _2, _3, _4, bodyblock) {
    return {
      sparql: outdentString(bodyblock.ast, 4)
    };
  },
  bodygraphql(_1, _2, _3, _4, bodyblock) {
    return {
      graphql: {
        query: outdentString(bodyblock.ast, 4)
      }
    };
  },
  bodygraphqlvars(_1, _2, _3, _4, bodyblock) {
    return {
      graphql: {
        variables: outdentString(bodyblock.ast, 4)
      }
    };
  },
  bodyformurlencoded(_1, _2, _3, _4, dictionary) {
    return {
      formUrlEncoded: mapPairListToKeyValPairs(dictionary.ast)
    };
  },
  bodymultipart(_1, _2, _3, _4, dictionary) {
    return {
      multipartForm: mapPairListToKeyValPairsMultipart(dictionary.ast)
    };
  },
  bodyfile(_1, _2, _3, _4, dictionary) {
    return {
      file: mapPairListToKeyValPairsFile(dictionary.ast)
    };
  }

});

const parseExample = (input) => {
  const match = exampleGrammar.match(input);

  if (match.succeeded()) {
    let ast = sem(match).ast;
    return ast;
  } else {
    throw new Error(match.message);
  }
};

module.exports = parseExample;
