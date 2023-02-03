const parser = require("../src/index");

describe("parser", () => {
  it("should parse the bru file", () => {
    const input = `
headers {
  content-type: application/json
  Authorization: Bearer 123
}

headers:disabled {
  transaction-id: {{transactionId}}
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
          "name": "content-type",
          "value": "application/json",
          "enabled": true
        },
        {
          "name": "Authorization",
          "value": "Bearer 123",
          "enabled": true
        },
        {
          "name": "transaction-id",
          "value": "{{transactionId}}",
          "enabled": false
        }
      ],
      "script": "  function onResponse(request, response) {\n    expect(response.status).to.equal(200);\n  }"
    }

    expect(output).toEqual(expected);
  });
});
