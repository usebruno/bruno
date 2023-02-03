const parser = require("../src/index");

describe("parser", () => {
  it("should parse the bru file", () => {
    const input = `
headers {
  hello: world
  foo: bar
}

script {
  function onResponse(request, response) {
    expect(response.status).to.equal(200);
  }
}
`;

    const output = parser(input);
    const expected = {
      "headers": [
        {
          "name": "hello",
          "value": "world",
          "enabled": true
        },
        {
          "name": "foo",
          "value": "bar",
          "enabled": true
        }
      ],
      "script": "  function onResponse(request, response) {\n    expect(response.status).to.equal(200);\n  }"
    }
    expect(output).toEqual(expected);
  });
});
