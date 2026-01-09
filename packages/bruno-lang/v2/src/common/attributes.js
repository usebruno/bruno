/**
 * Base AST attributes common to all grammar parsers in examples
 * These attributes handle common grammar constructs like dictionaries, pairs, text blocks, etc.
 */
const astBaseAttribute = {
  dictionary(_1, _2, pairlist, _3) {
    return pairlist.ast;
  },
  pairlist(_1, pair, _2, rest) {
    return [pair.ast, ...rest.ast];
  },
  pair(_1, key, _2, _3, _4, value, _5) {
    let res = {};
    if (Array.isArray(value.ast)) {
      res[key.ast] = value.ast;
      return res;
    }
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
  multilinetextblock(_1, content, _2, _3, contentType) {
    const multilineString = content.sourceString
      .split('\n')
      .map((line) => line.slice(4))
      .join('\n');

    if (!contentType.sourceString) {
      return multilineString;
    }
    return `${multilineString} ${contentType.sourceString}`;
  },
  singlelinevalue(chars) {
    return chars.sourceString?.trim() || '';
  },
  _iter(...elements) {
    return elements.map((e) => e.ast);
  }
};

module.exports = astBaseAttribute;
