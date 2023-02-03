const parser = require("../src/index");

describe("parser", () => {
  it("should parse headers", () => {
    const input = `
headers {
  hello: world
  foo: bar
}`;

    const output = parser(input);
    console.log(output);
  });

  it("should parse script body", () => {
    const input = `
script {
  function onResponse(request, response) {
    expect(response.status).to.equal(200);
  }
}
`;

    const output = parser(input);
    console.log(output);
  });
});
