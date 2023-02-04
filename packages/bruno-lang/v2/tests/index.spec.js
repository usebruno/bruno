const parser = require("../src/index");

describe("parser", () => {
  it("should parse the bru file", () => {
    const input = `
query {
  apiKey: secret
  numbers: 998877665
}

query:disabled {
  message: hello
}

headers {
  content-type: application/json
  Authorization: Bearer 123
}

headers:disabled {
  transaction-id: {{transactionId}}
}

body:form-urlencoded {
  apikey: secret
  numbers: +91998877665
}

body:form-urlencoded:disabled {
  message: hello
}

body:multipart-form {
  apikey: secret
  numbers: +91998877665
}

body:multipart-form:disabled {
  message: hello
}

body:json {
  {
    "hello": "world"
  }
}

body:text {
  This is a text body
}

body:xml {
  <xml>
    <name>John</name>
    <age>30</age>
  </xml>
}

body:graphql {
  {
    launchesPast {
      launch_site {
        site_name
      }
      launch_success
    }
  }
}

body:graphql:vars {
  {
    "limit": 5
  }
}

script {
  function onResponse(request, response) {
    expect(response.status).to.equal(200);
  }
}
`;

    const output = parser(input);
    const expected = {
      "query": [{
        "name": "apiKey",
        "value": "secret",
        "enabled": true
      }, {
        "name": "numbers",
        "value": "998877665",
        "enabled": true
      }, {
        "name": "message",
        "value": "hello",
        "enabled": false
      }],
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
      "body": {
        "json": "  {\n    \"hello\": \"world\"\n  }",
        "text": "  This is a text body",
        "xml": "  <xml>\n    <name>John</name>\n    <age>30</age>\n  </xml>",
        "graphql": {
          "query": "  {\n    launchesPast {\n      launch_site {\n        site_name\n      }\n      launch_success\n    }\n  }",
          "variables": "  {\n    \"limit\": 5\n  }"
        },
        "formUrlEncoded": [
          {
            "name": "apikey",
            "value": "secret",
            "enabled": true
          },
          {
            "name": "numbers",
            "value": "+91998877665",
            "enabled": true
          },
          {
            "name": "message",
            "value": "hello",
            "enabled": false
          }
        ],
        "multipartForm": [
          {
          "name": "apikey",
            "value": "secret",
            "enabled": true
          },
          {
            "name": "numbers",
            "value": "+91998877665",
            "enabled": true
          },
          {
            "name": "message",
            "value": "hello",
            "enabled": false
          }
        ]
      },
      "script": "  function onResponse(request, response) {\n    expect(response.status).to.equal(200);\n  }"
    }

    // console.log(JSON.stringify(output, null, 2));
    expect(output).toEqual(expected);
  });
});
