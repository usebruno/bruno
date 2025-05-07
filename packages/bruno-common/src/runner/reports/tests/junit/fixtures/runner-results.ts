// generated using fixtures/collection

import { T_RunnerResults } from "../../../../types";

const runnerResults: T_RunnerResults[] = [
  {
    "iterationIndex": 0,
    "results": [
      {
        "iterationIndex": 0,
        "request": {
          "method": "POST",
          "url": "https://echo.usebruno.com",
          "headers": {
            "content-type": "application/json"
          },
          "data": "{\n  \"ping\": \"pong\"\n}"
        },
        "response": {
          "status": 200,
          "statusText": "OK",
          "headers": {
            "server": "nginx/1.24.0 (Ubuntu)",
            "date": "Sun, 27 Apr 2025 13:33:09 GMT",
            "content-type": "application/json",
            "content-length": "20",
            "connection": "keep-alive",
            "host": "echo.usebruno.com:443",
            "x-real-ip": "223.186.89.227",
            "x-forwarded-for": "223.186.89.227",
            "x-forwarded-proto": "https",
            "accept": "application/json, text/plain, */*",
            "user-agent": "bruno-runtime/1.16.0",
            "request-start-time": "1745760788140",
            "accept-encoding": "gzip, compress, deflate, br",
            "strict-transport-security": "max-age=63072000; includeSubdomains",
            "x-frame-options": "DENY",
            "x-content-type-options": "nosniff"
          },
          "data": {
            "ping": "pong"
          },
        },
        "error": null,
        "status": "pass",
        "assertionResults": [
          {
            "lhsExpr": "res.status",
            "rhsExpr": "eq 200",
            "rhsOperand": "200",
            "operator": "eq",
            "status": "pass"
          },
          {
            "lhsExpr": "res.status",
            "rhsExpr": "neq 200",
            "rhsOperand": "200",
            "operator": "neq",
            "status": "fail",
            "error": "expected 200 to not equal 200"
          }
        ],
        "testResults": [],
        "runDuration": 1.349970083,
        "name": "Suite A",
        "path": "Tests/Suite A"
      },
      {
        "iterationIndex": 0,
        "request": {
          "method": "POST",
          "url": "https://echo.usebruno.com",
          "headers": {
            "content-type": "application/json"
          },
          "data": "{\n  \"ping\": \"pong\"\n}"
        },
        "response": {
          "status": 200,
          "statusText": "OK",
          "headers": {
            "server": "nginx/1.24.0 (Ubuntu)",
            "date": "Sun, 27 Apr 2025 13:33:09 GMT",
            "content-type": "application/json",
            "content-length": "20",
            "connection": "keep-alive",
            "host": "echo.usebruno.com:443",
            "x-real-ip": "223.186.89.227",
            "x-forwarded-for": "223.186.89.227",
            "x-forwarded-proto": "https",
            "accept": "application/json, text/plain, */*",
            "user-agent": "bruno-runtime/1.16.0",
            "request-start-time": "1745760789489",
            "accept-encoding": "gzip, compress, deflate, br",
            "strict-transport-security": "max-age=63072000; includeSubdomains",
            "x-frame-options": "DENY",
            "x-content-type-options": "nosniff"
          },
          "data": {
            "ping": "pong"
          },
        },
        "error": null,
        "status": "pass",
        "assertionResults": [
          {
            "lhsExpr": "res.status",
            "rhsExpr": "eq 200",
            "rhsOperand": "200",
            "operator": "eq",
            "status": "pass"
          },
          {
            "lhsExpr": "res.status",
            "rhsExpr": "neq 200",
            "rhsOperand": "200",
            "operator": "neq",
            "status": "fail",
            "error": "expected 200 to not equal 200"
          }
        ],
        "testResults": [],
        "runDuration": 0.270907542,
        "name": "Suite B",
        "path": "Tests/Suite B"
      },
      {
        "iterationIndex": 0,
        "request": {
          "method": "POST",
          "url": "http://invalid",
          "headers": {
            "content-type": "application/json"
          },
          "data": "{\n  \"ping\": \"pong\"\n}"
        },
        "response": {
          "status": "error",
          "statusText": null,
          "headers": null,
          "data": null,
          "responseTime": 0
        },
        "error": "getaddrinfo ENOTFOUND invalid",
        "status": "error",
        "assertionResults": [],
        "testResults": [],
        "runDuration": 0.009036625,
        "name": "Suite C",
        "path": "Tests/Suite C"
      }
    ]
  }
];

const junitReportJson = {
  "testsuites": {
    "testsuite": [
      {
        "@name": "Tests/Suite A",
        "@errors": 0,
        "@failures": 1,
        "@skipped": 0,
        "@tests": 2,
        "@timestamp": "2025-04-26T00:00:00.000",
        "@hostname": "hostname",
        "@time": "1.350",
        "@classname": "https://echo.usebruno.com",
        "testcase": [
          {
            "@name": "Tests/Suite A - res.status eq 200",
            "@status": "pass",
            "@classname": "https://echo.usebruno.com",
            "@time": "0.675"
          },
          {
            "@name": "Tests/Suite A - res.status neq 200",
            "@status": "fail",
            "@classname": "https://echo.usebruno.com",
            "@time": "0.675",
            "failure": [
              {
                "@type": "failure",
                "@message": "expected 200 to not equal 200"
              }
            ]
          }
        ],
        "system-out": {
          "$": "\nPOST https://echo.usebruno.com\n\n> content-type: application/json\n\n> {\n>   \"ping\": \"pong\"\n> }\n\n< 200 - OK\n\n< server: nginx/1.24.0 (Ubuntu)\n< date: Sun, 27 Apr 2025 13:33:09 GMT\n< content-type: application/json\n< content-length: 20\n< connection: keep-alive\n< host: echo.usebruno.com:443\n< x-real-ip: 223.186.89.227\n< x-forwarded-for: 223.186.89.227\n< x-forwarded-proto: https\n< accept: application/json, text/plain, */*\n< user-agent: bruno-runtime/1.16.0\n< request-start-time: 1745760788140\n< accept-encoding: gzip, compress, deflate, br\n< strict-transport-security: max-age=63072000; includeSubdomains\n< x-frame-options: DENY\n< x-content-type-options: nosniff\n\n\n< {\n<   \"ping\": \"pong\"\n< }\n"
        }
      },
      {
        "@name": "Tests/Suite B",
        "@errors": 0,
        "@failures": 1,
        "@skipped": 0,
        "@tests": 2,
        "@timestamp": "2025-04-26T00:00:00.000",
        "@hostname": "hostname",
        "@time": "0.271",
        "@classname": "https://echo.usebruno.com",
        "testcase": [
          {
            "@name": "Tests/Suite B - res.status eq 200",
            "@status": "pass",
            "@classname": "https://echo.usebruno.com",
            "@time": "0.135"
          },
          {
            "@name": "Tests/Suite B - res.status neq 200",
            "@status": "fail",
            "@classname": "https://echo.usebruno.com",
            "@time": "0.135",
            "failure": [
              {
                "@type": "failure",
                "@message": "expected 200 to not equal 200"
              }
            ]
          }
        ],
        "system-out": {
          "$": "\nPOST https://echo.usebruno.com\n\n> content-type: application/json\n\n> {\n>   \"ping\": \"pong\"\n> }\n\n< 200 - OK\n\n< server: nginx/1.24.0 (Ubuntu)\n< date: Sun, 27 Apr 2025 13:33:09 GMT\n< content-type: application/json\n< content-length: 20\n< connection: keep-alive\n< host: echo.usebruno.com:443\n< x-real-ip: 223.186.89.227\n< x-forwarded-for: 223.186.89.227\n< x-forwarded-proto: https\n< accept: application/json, text/plain, */*\n< user-agent: bruno-runtime/1.16.0\n< request-start-time: 1745760789489\n< accept-encoding: gzip, compress, deflate, br\n< strict-transport-security: max-age=63072000; includeSubdomains\n< x-frame-options: DENY\n< x-content-type-options: nosniff\n\n\n< {\n<   \"ping\": \"pong\"\n< }\n"
        }
      },
      {
        "@name": "Tests/Suite C",
        "@errors": 1,
        "@failures": 0,
        "@skipped": 0,
        "@tests": 1,
        "@timestamp": "2025-04-26T00:00:00.000",
        "@hostname": "hostname",
        "@time": "0.009",
        "@classname": "http://invalid",
        "testcase": [
          {
            "@name": "Test suite has no errors",
            "@status": "fail",
            "@classname": "http://invalid",
            "@time": "0.009",
            "error": [
              {
                "@type": "error",
                "@message": "getaddrinfo ENOTFOUND invalid"
              }
            ]
          }
        ],
        "system-err": {
          "$": "\nPOST http://invalid\n\n> content-type: application/json\n\n> {\n>   \"ping\": \"pong\"\n> }\n\n< error - \n\n< \"getaddrinfo ENOTFOUND invalid\"\n"
        }
      }
    ]
  }
};

export {
  runnerResults,
  junitReportJson
}