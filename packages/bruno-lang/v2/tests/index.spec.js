const parser = require("../src/index");

describe("parser", () => {
  it("should parse headers", () => {
    const input = `headers {
      hello: world,
      foo: bar
    }`;

    const expected = [
      { key: "hello", value: "world" },
      { key: "foo", value: "bar" }
    ];

    expect(parser(input)).toEqual(expected);
  });
});
