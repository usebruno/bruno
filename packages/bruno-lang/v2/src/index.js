const ohm = require("ohm-js");

const grammar = ohm.grammar(`Bru {
  Headers = "headers" "{" PairList "}"
  PairList = Pair ("," Pair)*
  Pair = Key ":" Value
  Key = identifier
  Value = stringLiteral
  identifier = alnum*
  stringLiteral = letter*
}`);

const sem = grammar.createSemantics().addAttribute('ast', {
  Headers(_, _1, PairList, _2) {
    return PairList.ast;
  },
  PairList(pairs, _, rest) {
    return [pairs.ast, ...rest.ast];
  },
  Pair(key, _, value) {
    return { key: key.ast, value: value.ast };
  },
  Key(id) {
    return id.sourceString;
  },
  Value(str) {
    return str.sourceString;
  },
  identifier(id) {
    return id.sourceString;
  },
  stringLiteral(str) {
    return str.sourceString;
  },
  _iter(...elements) {
    return elements.map(e => e.ast);
  }
});

const input = `headers {
  hello: world,
  foo: bar
}`;

const parser = (input) => {
  const match = grammar.match(input);

  if(match.succeeded()) {
    return sem(match).ast;
  } else {
    throw new Error(match.message);
  }
}

module.exports = parser;
