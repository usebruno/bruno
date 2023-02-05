const parser = require("../src/envToJson");

describe("env parser", () => {
  it("should parse empty vars", () => {
    const input = `
vars {
}`;

    const output = parser(input);
    const expected = {
      "variables": []
    };

    expect(output).toEqual(expected);
  });

  it("should parse single var line", () => {
    const input = `
vars {
  url: http://localhost:3000
}`;

    const output = parser(input);
    const expected = {
      "variables": [{
        "name": "url",
        "value": "http://localhost:3000",
        "enabled" : true,
      }]
    };

    expect(output).toEqual(expected);
  });

  it("should parse multiple var lines", () => {
    const input = `
vars {
  url: http://localhost:3000
  port: 3000
  ~token: secret
}`;

    const output = parser(input);
    const expected = {
      "variables": [{
        "name": "url",
        "value": "http://localhost:3000",
        "enabled" : true
      }, {
        "name": "port",
        "value": "3000",
        "enabled" : true
      }, {
        "name": "token",
        "value": "secret",
        "enabled" : false
      }]
    };

    expect(output).toEqual(expected);
  });

  it("should gracefully handle empty lines and spaces", () => {
    const input = `

vars {
      url:     http://localhost:3000   
  port: 3000
}

`;

    const output = parser(input);
    const expected = {
      "variables": [{
        "name": "url",
        "value": "http://localhost:3000",
        "enabled" : true,
      }, {
        "name": "port",
        "value": "3000",
        "enabled" : true,
      }]
    };

    expect(output).toEqual(expected);
  });
});
