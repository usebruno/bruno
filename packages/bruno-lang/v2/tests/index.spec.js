const fs = require("fs");
const path = require("path");
const parser = require("../src/bruToJson");

describe("parser", () => {
  it("should parse the bru file", () => {
    const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'request.bru'), 'utf8');
    const expected = require("./fixtures/request.json");
    const output = parser(input);

    // console.log(JSON.stringify(output, null, 2));
    expect(output).toEqual(expected);
  });
});
