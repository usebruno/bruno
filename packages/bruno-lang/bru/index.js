const { parse, stringify } = require('bru-js');

const parseRequest = (bru) => {
  const ast = parse(bru);
};

const stringifyRequest = (json) => {
  const { type, seq, name, request } = json;
  const ast = {
    type: 'multimap',
    value: []
  };

  const metaAst = {
    type: 'multimap',
    value: []
  };
  metaAst.value.push({
    type: 'pair',
    key: 'name',
    value: name
  });

  ast.value.push({
    type: 'pair',
    key: 'meta',
    value: metaAst
  });

  return stringify(ast);
};
