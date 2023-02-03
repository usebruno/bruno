const bruToJsonV2 = require("../src/index");

const assertSingleHeader = (input) => {
  const output = bruToJsonV2(input);

  const expected = {
    "headers": [{
      "name": "hello",
      "value": "world",
      "enabled": true
    }]
  };
  expect(output).toEqual(expected);
};

describe("headers parser", () => {
  it("should parse empty header", () => {
    const input = `
headers {
}`;

    const output = bruToJsonV2(input);
    const expected = {
      "headers": []
    };
    expect(output).toEqual(expected);
  });

  it("should parse single header", () => {
    const input = `
headers {
  hello: world
}`;

    assertSingleHeader(input);
  });

  it("should parse single header with spaces", () => {
    const input = `
headers {
      hello: world   
}`;

    assertSingleHeader(input);
  });

  it("should parse single header with spaces and newlines", () => {
    const input = `
headers {

      hello: world   
  

}`;

    assertSingleHeader(input);
  });

  it("should parse multi headers", () => {
    const input = `
headers {
  hello: world
  foo: bar
}`;

    const output = bruToJsonV2(input);
    const expected = {
      "headers": [{
        "name": "hello",
        "value": "world",
        "enabled": true
      }, {
        "name": "foo",
        "value": "bar",
        "enabled": true
      }]
    };
    expect(output).toEqual(expected);
  });

  it("should throw error on invalid header", () => {
    const input = `
headers {
  hello: world
  foo
}`;

    expect(() => bruToJsonV2(input)).toThrow();
  });

  it("should throw error on invalid header", () => {
    const input = `
headers {
  hello: world
  foo: bar}`;

    expect(() => bruToJsonV2(input)).toThrow();
  });
});

