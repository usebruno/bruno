const ohm = require('ohm-js');
const _ = require('lodash');

const grammar = ohm.grammar(`Env {
  EnvFile = (entry)*
  entry = st* key st* "=" st* value st* nl*
  key = keychar*
  value = valuechar*
  keychar = ~(nl | st | nl | "=") any
  valuechar = ~nl any
  nl = "\\r"? "\\n"
  st = " " | "\\t"
}`);

const concatArrays = (objValue, srcValue) => {
  if (_.isArray(objValue) && _.isArray(srcValue)) {
    return objValue.concat(srcValue);
  }
};

const sem = grammar.createSemantics().addAttribute('ast', {
  EnvFile(entries) {
    return _.reduce(
      entries.ast,
      (result, item) => {
        return _.mergeWith(result, item, concatArrays);
      },
      {}
    );
  },
  entry(_1, key, _2, _3, _4, value, _5, _6) {
    return { [key.ast.trim()]: value.ast.trim() };
  },
  key(chars) {
    return chars.sourceString;
  },
  value(chars) {
    return chars.sourceString;
  },
  nl(_1, _2) {
    return '';
  },
  st(_) {
    return '';
  },
  _iter(...elements) {
    return elements.map((e) => e.ast);
  }
});

const parser = (input) => {
  const match = grammar.match(input);

  if (match.succeeded()) {
    const ast = sem(match).ast;
    return postProcessEntries(ast);
  } else {
    throw new Error(match.message);
  }
};

function postProcessEntries(ast) {
  const processed = {};

  for (const key in ast) {
    const value = ast[key];

    if (!isNaN(value)) {
      processed[key] = parseFloat(value); // Convert to number if it's a valid number
    } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
      processed[key] = value.toLowerCase() === 'true'; // Convert to boolean if it's 'true' or 'false'
    } else {
      processed[key] = value; // Otherwise, keep it as a string
    }
  }

  return processed;
}

module.exports = parser;
