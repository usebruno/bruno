const ohm = require("ohm-js");

const grammar = ohm.grammar(`Bru {
  BruFile = (script | test | headers)*
  nl = "\\r"? "\\n"
  st = " " | "\\t"
  tagend = nl "}"
  
  headers = "headers" st* "{" nl* pairlist tagend
  
  pairlist = pair (~tagend nl pair)* (~tagend space)*
  pair = st* key st* ":" st* val st*
  key = alnum*
  val = letter*

  script = "script" st* "{" codeblock tagend
  test = "test" st* "{" codeblock tagend

  codeblock = codeline (~tagend nl codeline)*
  codeline = codechar*
  codechar = ~nl any 
}`);

const sem = grammar.createSemantics().addAttribute('ast', {
  headers(_1, _2, _3, _4, pairlist, _5) {
    return pairlist.ast;
  },
  pairlist(pair, _1, rest, _2) {
    return [pair.ast, ...rest.ast];
  },
  pair(_1, key, _2, _3, _4, val, _5) {
    let res = {};
    res[key.ast] = val.ast;
    return res;
  },
  key(chars) {
    return chars.sourceString;
  },
  val(chars) {
    return chars.sourceString;
  },
  script(_1, _2, _3, codeblock, _4) {
    return codeblock.sourceString;
  },
  test(_1, _2, _3, codeblock, _4) {
    return codeblock.sourceString;
  },
  codeblock(line, _1, rest) {
    return [line.ast, ...rest.ast].join('\n');
  },
  codeline(chars) {
    return chars.sourceString;
  },
  codechar(char) {
    return char.sourceString;
  },
  nl(_1, _2) {
    return '';
  },
  st(_) {
    return '';
  },
  tagend(_1 ,_2) {
    return '';
  },
  _iter(...elements) {
    return elements.map(e => e.ast);
  }
});

const parser = (input) => {
  const match = grammar.match(input);

  if(match.succeeded()) {
    return sem(match).ast;
  } else {
    console.log('match.message=========');
    console.log(match.message);
    throw new Error(match.message);
  }
}

module.exports = parser;
