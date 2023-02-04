/**
 * This test file is used to test the text parser.
 */
const parser = require("../src/index");

describe("script parser", () => {
  it("should parse script body", () => {
    const input = `
script {
  function onResponse(request, response) {
    expect(response.status).to.equal(200);
  }
}
`;

    const output = parser(input);
    const expected = "  function onResponse(request, response) {\n    expect(response.status).to.equal(200);\n  }";
    expect(output.script).toEqual(expected);
  });
});
