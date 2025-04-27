const runnerResults = [
  {
    "iterationIndex": 0,
    "results": [
      {
        "test": {
          "filename": "tests/Suite A.bru"
        },
        "request": {
          "method": "POST",
          "url": "https://echo.usebruno.com",
          "headers": {
            "content-type": "text/plain"
          },
          "data": "ping"
        },
        "response": {
          "status": 200,
          "statusText": "OK",
          "headers": {
            "server": "nginx/1.24.0 (Ubuntu)",
            "date": "Sat, 26 Apr 2025 16:30:44 GMT",
            "content-type": "text/plain",
            "content-length": "4",
            "connection": "keep-alive",
            "host": "echo.usebruno.com:443",
            "x-real-ip": "223.231.171.223",
            "x-forwarded-for": "223.231.171.223",
            "x-forwarded-proto": "https",
            "accept": "application/json, text/plain, */*",
            "user-agent": "bruno-runtime/2.2.2",
            "request-start-time": "1745685043490",
            "accept-encoding": "gzip, compress, deflate, br",
            "strict-transport-security": "max-age=63072000; includeSubdomains",
            "x-frame-options": "DENY",
            "x-content-type-options": "nosniff"
          },
          "data": "ping",
          "responseTime": 1154
        },
        "error": null,
        "status": "pass",
        "assertionResults": [
          {
            "uid": "wXixkI53HjLbUMUFLu18Y",
            "lhsExpr": "res.status",
            "rhsExpr": "eq 200",
            "rhsOperand": "200",
            "operator": "eq",
            "status": "pass"
          },
          {
            "uid": "6q16NRswzLWkcfzqP53As",
            "lhsExpr": "res.status",
            "rhsExpr": "neq 200",
            "rhsOperand": "200",
            "operator": "neq",
            "status": "fail",
            "error": "expected 200 to not equal 200"
          }
        ],
        "testResults": [],
        "shouldStopRunnerExecution": false,
        "runDuration": 1.173969333,
        "name": "Suite A",
        "path": "Tests/Suite A",
        "iterationIndex": 0
      },
      {
        "test": {
          "filename": "tests/suite_b.bru"
        },
        "request": {
          "method": "POST",
          "url": "https://echo.usebruno.com",
          "headers": {
            "content-type": "text/plain"
          },
          "data": "ping"
        },
        "response": {
          "status": 200,
          "statusText": "OK",
          "headers": {
            "server": "nginx/1.24.0 (Ubuntu)",
            "date": "Sat, 26 Apr 2025 16:30:45 GMT",
            "content-type": "text/plain",
            "content-length": "4",
            "connection": "keep-alive",
            "host": "echo.usebruno.com:443",
            "x-real-ip": "223.231.171.223",
            "x-forwarded-for": "223.231.171.223",
            "x-forwarded-proto": "https",
            "accept": "application/json, text/plain, */*",
            "user-agent": "bruno-runtime/2.2.2",
            "request-start-time": "1745685044663",
            "accept-encoding": "gzip, compress, deflate, br",
            "strict-transport-security": "max-age=63072000; includeSubdomains",
            "x-frame-options": "DENY",
            "x-content-type-options": "nosniff"
          },
          "data": "ping",
          "responseTime": 261
        },
        "error": null,
        "status": "pass",
        "assertionResults": [
          {
            "uid": "p1HVETukD3P-zRPP3rjhi",
            "lhsExpr": "res.status",
            "rhsExpr": "eq 200",
            "rhsOperand": "200",
            "operator": "eq",
            "status": "pass"
          },
          {
            "uid": "gudOuMRNFFPY1X674dDih",
            "lhsExpr": "res.status",
            "rhsExpr": "neq 200",
            "rhsOperand": "200",
            "operator": "neq",
            "status": "fail",
            "error": "expected 200 to not equal 200"
          }
        ],
        "testResults": [],
        "shouldStopRunnerExecution": false,
        "runDuration": 0.267295917,
        "name": "Suite B",
        "path": "Tests/Suite B",
        "iterationIndex": 0
      }
    ]
  }
]

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
        "@hostname": "lohits-MacBook-Air.local",
        "@time": "1.174",
        "@classname": "https://echo.usebruno.com",
        "testcase": [
          {
            "@name": "res.status eq 200",
            "@status": "pass",
            "@classname": "https://echo.usebruno.com",
            "@time": "0.587"
          },
          {
            "@name": "res.status neq 200",
            "@status": "fail",
            "@classname": "https://echo.usebruno.com",
            "@time": "0.587",
            "failure": [
              {
                "@type": "failure",
                "@message": "expected 200 to not equal 200"
              }
            ]
          }
        ]
      },
      {
        "@name": "Tests/Suite B",
        "@errors": 0,
        "@failures": 1,
        "@skipped": 0,
        "@tests": 2,
        "@timestamp": "2025-04-26T00:00:00.000",
        "@hostname": "lohits-MacBook-Air.local",
        "@time": "0.267",
        "@classname": "https://echo.usebruno.com",
        "testcase": [
          {
            "@name": "res.status eq 200",
            "@status": "pass",
            "@classname": "https://echo.usebruno.com",
            "@time": "0.134"
          },
          {
            "@name": "res.status neq 200",
            "@status": "fail",
            "@classname": "https://echo.usebruno.com",
            "@time": "0.134",
            "failure": [
              {
                "@type": "failure",
                "@message": "expected 200 to not equal 200"
              }
            ]
          }
        ]
      }
    ]
  }
}

export {
  runnerResults,
  junitReportJson
}