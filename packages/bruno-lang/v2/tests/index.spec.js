const parser = require("../src/index");

describe("parser", () => {
  it("should parse the bru file", () => {
    const input = `
meta {
  name: Send Bulk SMS
  type: http
  seq: 1
}

get {
  url: https://api.textlocal.in/send/
  body: json
}

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

vars {
  token: $res.body.token
}

vars:disabled {
  petId: $res.body.id
}

vars:local {
  orderNumber: $res.body.orderNumber
}

vars:local:disabled {
  transactionId: $res.body.transactionId
}

assert {
  $res.status: 200
}

assert:disabled {
  $res.body.message: success
}

test {
  function onResponse(request, response) {
    expect(response.status).to.equal(200);
  }
}

docs {
  This request needs auth token to be set in the headers.
}
`;

    const output = parser(input);
    const expected = {
      "meta": {
        "name": "Send Bulk SMS",
        "type": "http",
        "seq": "1"
      },
      "http": {
        "method": "GET",
        "url": "https://api.textlocal.in/send/",
        "body": "json"
      },
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
      "vars": [
        {
          "name": "token",
          "value": "$res.body.token",
          "enabled": true
        },
        {
          "name": "petId",
          "value": "$res.body.id",
          "enabled": false
        }
      ],
      "varsLocal": [
        {
          "name": "orderNumber",
          "value": "$res.body.orderNumber",
          "enabled": true
        },
        {
          "name": "transactionId",
          "value": "$res.body.transactionId",
          "enabled": false
        }
      ],
      "assert": [
        {
          "name": "$res.status",
          "value": "200",
          "enabled": true
        },
        {
          "name": "$res.body.message",
          "value": "success",
          "enabled": false
        }
      ],
      "test": "  function onResponse(request, response) {\n    expect(response.status).to.equal(200);\n  }",
      "docs": "  This request needs auth token to be set in the headers."
    }

    // console.log(JSON.stringify(output, null, 2));
    expect(output).toEqual(expected);
  });
});
