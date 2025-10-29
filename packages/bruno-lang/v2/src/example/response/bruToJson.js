const ohm = require('ohm-js');
const _ = require('lodash');
const { safeParseJson, outdentString } = require('../../utils');

/**
 * Response Block Grammar for Bruno Examples
 *
 * Handles parsing of response blocks within example files.
 * Supports headers, status, and body parsing.
 */
const responseGrammar = ohm.grammar(`Response {
  ResponseFile = responsecontent*
  
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

  // Response content
  responsecontent = responseheaders | responsestatus | responsebodyblock
  responseheaders = "headers" st* ":" st* dictionary nl*
  responsestatus = "status" st* ":" st* dictionary nl*
  responsebodyblock = "body" st* ":" st* "{" nl* responsebodyfields tagend
  responsebodyfields = (responsebodytype | responsebodycontentvalue)*
  responsebodytype = st* "type" st* ":" st* valuechar* nl*
  responsebodycontentvalue = st* "content" st* ":" st* multilinetextblock
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

const sem = responseGrammar.createSemantics().addAttribute('ast', {
  ResponseFile(tags) {
    if (!tags || !tags.ast || !tags.ast.length) {
      return {};
    }
    // Filter out empty items and merge the results
    const validItems = tags.ast.filter((item) => item && Object.keys(item).length > 0);
    return _.reduce(validItems, (result, item) => {
      return _.merge(result, item);
    }, {});
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
    if (chars.ctorName === 'list') {
      return chars.ast;
    }
    try {
      let isMultiline = chars.sourceString?.startsWith(`'''`) && chars.sourceString?.endsWith(`'''`);
      if (isMultiline) {
        const multilineString = chars.sourceString?.replace(/^'''|'''$/g, '');
        return multilineString
          .split('\n')
          .map((line) => line.slice(4))
          .join('\n');
      }
      return chars.sourceString ?? '';
    } catch (err) {
      console.error(err);
    }
    return chars.sourceString ?? '';
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
  nl(_1, _2) {
    return '';
  },
  st(_) {
    return '';
  },
  tagend(_1, _2) {
    return '';
  },
  _terminal() {
    return this.sourceString;
  },
  multilinetextblockdelimiter(_) {
    return '';
  },
  multilinetextblock(_1, content, _2) {
    // Join all the content between the triple quotes and trim it
    return content.sourceString.trim();
  },
  _iter(...elements) {
    return elements.map((e) => e.ast);
  },

  responsecontent(content) {
    return content.ast;
  },
  responseheaders(_1, _2, _3, _4, dictionary, _6) {
    return { headers: mapPairListToKeyValPairs(dictionary.ast) };
  },
  responsestatus(_1, _2, _3, _4, dictionary, _6) {
    const statusPairs = mapPairListToKeyValPairs(dictionary.ast, false);
    return {
      status: statusPairs.find((p) => p.name === 'code')?.value || 200,
      statusText: statusPairs.find((p) => p.name === 'text')?.value || 'OK'
    };
  },
  responsebodyblock(_1, _2, _3, _4, _5, _6, responsebodyfields, _8) {
    // Extract type and content from the array structure
    // responsebodyfields.ast is an array like [{ type: 'json' }, { content: "'''..." }]
    const bodyData = {};

    if (Array.isArray(responsebodyfields.ast)) {
      responsebodyfields.ast.forEach((field) => {
        if (field && typeof field === 'object') {
          if (field.type !== undefined) {
            bodyData.type = field.type;
          }
          if (field.content !== undefined) {
            bodyData.content = field.content;
          }
        }
      });
    }

    return {
      body: bodyData
    };
  },
  responsebodytype(_1, _2, _3, _4, _5, value, _7) {
    return {
      type: value.sourceString ? value.sourceString.trim() : ''
    };
  },
  responsebodycontentvalue(_1, _2, _3, _4, _5, multilinetextblock) {
    const multilineString = multilinetextblock.sourceString?.replace(/^'''|'''$/g, '').replace(/  $/g, '').replace(/^\n|\n$/g, '');

    return {
      content: outdentString(multilineString ?? '', 4)
    };
  }
});

const parseResponse = (input) => {
  const match = responseGrammar.match(input);

  if (match.succeeded()) {
    let ast = sem(match).ast;
    return ast;
  } else {
    console.log('match failed', match);
    throw new Error(match.message);
  }
};

module.exports = parseResponse;
