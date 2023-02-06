const Bru = require('./bru');
const BrunoRequest = require('./bruno-request');
const BrunoResponse = require('./bruno-response');
const _ = require('lodash');
const jsonQuery = require('json-query');


class VarsRuntime {
  constructor() {
  }

  runResponseVars(vars, request, response, environment, collectionVariables, collectionPath) {
    const bru = new Bru(environment, collectionVariables);
    const req = new BrunoRequest(request);
    const res = new BrunoResponse(response);

    res.q = function(expr) {
        const output = jsonQuery(expr, {data: res.body});

        return output.value;
    }

    const result = {

    };

    const context = {
        bru,
        req,
        res
    }
    console.log(JSON.stringify(vars, null, 2));

    _.each(vars, (v) => {
        result[v.name] = eval(v.value, context);
    });

    console.log(result);


  }
}

module.exports = {
  VarsRuntime
};