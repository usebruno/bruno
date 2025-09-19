/**
 * This test file is used to test list parsing in various BruFile blocks.
 */
const parser = require('../src/bruToJson');

describe('List Support in BruFile Blocks', () => {

  describe('Basic List Functionality', () => {
    describe('Valid List Syntax', () => {
      it('should parse simple list with proper indentation', () => {
        const input = `
meta {
  tags: [
    tag_1
    tag_2
  ]
}
`;
        const output = parser(input);
        const expected = {
          meta: {
            seq: 1,
            tags: ['tag_1', 'tag_2'],
            type: "http"
          }
        };
        expect(output).toEqual(expected);
      });

      it('should parse list with mixed properties', () => {
        const input = `
meta {
  name: request_name
  tags: [
    regression
    smoke_test
  ]
  type: http
}
`;
        const output = parser(input);
        const expected = {
          meta: {
            seq: 1,
            name: "request_name",
            tags: ['regression', 'smoke_test'],
            type: "http"
          }
        };
        expect(output).toEqual(expected);
      });

      it('should parse list with varying indentation inside list', () => {
        const input = `
meta {
  tags: [
  tag_1
    tag_2
      tag_3
  ]
}
`;
        const output = parser(input);
        const expected = {
          meta: {
            seq: 1,
            tags: ['tag_1', 'tag_2', 'tag_3'],
            type: "http"
          }
        };
        expect(output).toEqual(expected);
      });

      it('should parse list with alphanumeric, underscore, and hyphen characters', () => {
        const input = `
meta {
  tags: [
    tag-with-hyphens
    tag_with_underscores
    tag123numbers
    CamelCaseTag
  ]
}
`;
        const output = parser(input);
        const expected = {
          meta: {
            seq: 1,
            tags: ['tag-with-hyphens', 'tag_with_underscores', 'tag123numbers', 'CamelCaseTag'],
            type: "http"
          }
        };
        expect(output).toEqual(expected);
      });
    });

    describe('Invalid List Syntax', () => {
      it('should fail when list items have no indentation', () => {
        const input = `
meta {
  tags: [
    tag_1
tag_2
  ]
}
`;
        expect(() => parser(input)).toThrow();
      });

      it('should fail when list has empty lines between items', () => {
        const input = `
meta {
  tags: [
    tag_1
    
    tag_2
  ]
}
`;
        expect(() => parser(input)).toThrow();
      });

      it('should fail when list opening bracket is on same line as first item', () => {
        const input = `
meta {
  tags: [tag_1
  tag_2
  ]
}
`;
        expect(() => parser(input)).toThrow();
      });

      it('should fail when list closing bracket is on same line as last item', () => {
        const input = `
meta {
  tags: [
    tag_1
    tag_2]
}
`;
        expect(() => parser(input)).toThrow();
      });

      it('should fail when list items contain invalid characters - variation 1', () => {
        const input = `
meta {
  tags: [
    tag*1
    tag@2
  ]
}
`;
        expect(() => parser(input)).toThrow();
      });

      it('should fail when list items contain spaces', () => {
        const input = `
meta {
  tags: [
    tag with spaces
    another-tag
  ]
}
`;
        expect(() => parser(input)).toThrow();
      });

      it('should fail when list items contain invalid characters - variation 2', () => {
        const input = `
meta {
  tags: [
    tag_1,
    tag_2
  ]
}
`;
        expect(() => parser(input)).toThrow();
      });

      it('should fail when first list item has no indentation', () => {
        const input = `
meta {
  tags: [ tag_1
    tag_2
  ]
}
`;
        expect(() => parser(input)).toThrow();
      });

      it('should fail when list item are not seperated by atleast one newline', () => {
        const input = `
meta {
  tags: [ 
    tag_1
    tag_2 tag_3
  ]
}
`;
        expect(() => parser(input)).toThrow();
      });

      it('should not parse empty list', () => {
        const input = `
meta {
  tags: [
  ]
}
`;

        expect(() => parser(input)).toThrow();
      });
    });

    describe('String Values That Look Like Lists', () => {
      it('should parse inline bracketed strings as regular values', () => {
        const input = `
meta {
  name: [some name]
  tags: [
    actual_list_item
  ]
}
`;
        const output = parser(input);
        const expected = {
          meta: {
            seq: 1,
            name: "[some name]",
            tags: ['actual_list_item'],
            type: "http"
          }
        };
        expect(output).toEqual(expected);
      });

      it('should parse bracketed strings with spaces as regular values', () => {
        const input = `
meta {
  name: [ this is the name ]
  tags: [
    tag_1
    tag_2
  ]
}
`;
        const output = parser(input);
        const expected = {
          meta: {
            seq: 1,
            name: "[ this is the name ]",
            tags: ['tag_1', 'tag_2'],
            type: "http"
          }
        };
        expect(output).toEqual(expected);
      });

      it('should fail when multiline bracketed strings are malformed', () => {
        const input = `
meta {
  name: [this spans
  multiple lines
  ]
}
`;
        expect(() => parser(input)).toThrow();
      });
    });
  });

  describe('Lists in Meta Block', () => {
    it('should parse tags in meta block', () => {
      const input = `
meta {
  name: API Test
  tags: [
    api
    integration
    v1
  ]
}
`;
      const output = parser(input);
      const expected = {
        meta: {
          name: "API Test",
          tags: ['api', 'integration', 'v1'],
          seq: 1,
          type: "http"
        }
      };
      expect(output).toEqual(expected);
    });

    it('should parse custom list properties in meta block', () => {
      const input = `
meta {
  categories: [
    user-management
    auth
  ]
  environments: [
    staging
    production
  ]
}
`;
      const output = parser(input);
      const expected = {
        meta: {
          seq: 1,
          categories: ['user-management', 'auth'],
          environments: ['staging', 'production'],
          type: "http"
        }
      };
      expect(output).toEqual(expected);
    });
  });

  describe('Lists type content in Body Blocks', () => {
    it('should parse bru file with a text body block that has list type values - variation 1', () => {
      const input = `
meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}
body:text {
  meta {
    name: [name]
    tags: [
      tag_1
      tag_2
    ]
  }
}
`;
      const output = parser(input);

      const expected = {
        meta: {
          name: "[name]",
          tags: [
            "tag_1",
            "tag_2"
          ],
          seq: 1,
          type: 'http'
        },
        body: {
          text: `meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}`
        }
      };
      expect(output).toEqual(expected);
    });

    it('should parse bru file with a text body block that has list type values - variation 2', () => {
      const input = `
meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}
body:text {
  meta {
    name: [name]
    tags: [
      tag_1
      tag_2
    ]
  }
}
`;
      const output = parser(input);

      const expected = {
        meta: {
          name: "[name]",
          tags: [
            "tag_1",
            "tag_2"
          ],
          seq: 1,
          type: 'http'
        },
        body: {
          text: `meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}`
        }
      };
      expect(output).toEqual(expected);
    });

    it('should parse bru file with a json body block that has list type values - variation 1', () => {
      const input = `
meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}
body:json {
  meta {
    name: [name]
    tags: [
      tag_1
      tag_2
    ]
  }
}
`;
      const output = parser(input);

      const expected = {
        meta: {
          name: "[name]",
          tags: [
            "tag_1",
            "tag_2"
          ],
          seq: 1,
          type: 'http'
        },
        body: {
          json: `meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}`
        }
      };
      expect(output).toEqual(expected);
    });

    it('should parse bru file with a json body block that has list type values - variation 2', () => {
      const input = `
meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}
body:json {
  meta {
    name: [name]
    tags: [
      tag_1
      tag_2
    ]
  }
}
`;
      const output = parser(input);

      const expected = {
        meta: {
          name: "[name]",
          tags: [
            "tag_1",
            "tag_2"
          ],
          seq: 1,
          type: 'http'
        },
        body: {
          json: `meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}`
        }
      };
      expect(output).toEqual(expected);
    });

    it('should parse bru file with a json body block that has array values', () => {
      const input = `
meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}
body:json {
  {
    array: [
      "1",
      "2",
      "3"
    ]
  }
}
`;
      const output = parser(input);

      const expected = {
        meta: {
          name: "[name]",
          tags: [
            "tag_1",
            "tag_2"
          ],
          seq: 1,
          type: 'http'
        },
        body: {
          json: `{
  array: [
    "1",
    "2",
    "3"
  ]
}`
        }
      };
      expect(output).toEqual(expected);
    });

    it('should parse bru file with a json body block that has array of objects - variation 1', () => {
      const input = `
meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}
body:json {
  {
    array: [
      {
        "id": 1
      },
      {
        "id": 2
      },
      {
        "id": 3
      }
    ]
  }
}
`;
      const output = parser(input);

      const expected = {
        meta: {
          name: "[name]",
          tags: [
            "tag_1",
            "tag_2"
          ],
          seq: 1,
          type: 'http'
        },
        body: {
          json: `{
  array: [
    {
      "id": 1
    },
    {
      "id": 2
    },
    {
      "id": 3
    }
  ]
}`
        }
      };
      expect(output).toEqual(expected);
    });

    it('should parse bru file with a json body block that has array of objects - variation 2', () => {
      const input = `
meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}
body:json {
  [{
    "foo": "bar"
  }]
}
`;
      const output = parser(input);

      const expected = {
        meta: {
          name: "[name]",
          tags: [
            "tag_1",
            "tag_2"
          ],
          seq: 1,
          type: 'http'
        },
        body: {
          json: `[{
  "foo": "bar"
}]`
        }
      };
      expect(output).toEqual(expected);
    });

    it('should parse bru file with a json body block that has array of objects - variation 3', () => {
      const input = `
meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}
body:json {
  [{"foo": "bar"}]
}
`;
      const output = parser(input);

      const expected = {
        meta: {
          name: "[name]",
          tags: [
            "tag_1",
            "tag_2"
          ],
          seq: 1,
          type: 'http'
        },
        body: {
          json: `[{"foo": "bar"}]`
        }
      };
      expect(output).toEqual(expected);
    });

    it('should parse bru file with a json body block that has objects and arrays - variation 1', () => {
      const input = `
meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}
body:json {
  {
    object: {
      array: [
        {
          "id": 1
        },
        {
          "id": 2
        },
        {
          "id": 3
        }
      ]
    }
  }
}
`;
      const output = parser(input);

      const expected = {
        meta: {
          name: "[name]",
          tags: [
            "tag_1",
            "tag_2"
          ],
          seq: 1,
          type: 'http'
        },
        body: {
          json: `{
  object: {
    array: [
      {
        "id": 1
      },
      {
        "id": 2
      },
      {
        "id": 3
      }
    ]
  }
}`
        }
      };
      expect(output).toEqual(expected);
    });

    it('should parse bru file with a json body block with complex arrays', () => {
      const input = `
meta {
  name: [name]
  tags: [
    tag_1
    tag_2
  ]
}
body:json {
  [
    "string",
    array: [
      "tag_1",
      "tag_2"
    ],
    object: {
      array: [
        {
          "id": 1
        },
        {
          "id": 2
        },
        {
          "id": 3
        }
      ]
    }
  ]
}
`;
      const output = parser(input);

      const expected = {
        meta: {
          name: "[name]",
          tags: [
            "tag_1",
            "tag_2"
          ],
          seq: 1,
          type: 'http'
        },
        body: {
          json: `[
  "string",
  array: [
    "tag_1",
    "tag_2"
  ],
  object: {
    array: [
      {
        "id": 1
      },
      {
        "id": 2
      },
      {
        "id": 3
      }
    ]
  }
]`
        }
      };
      expect(output).toEqual(expected);
    });
  });
});