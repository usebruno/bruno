const { describe, it, expect } = require('@jest/globals');
const fs = require('fs');

const makeHtmlOutput = require('../../src/reporters/html');

describe('makeHtmlOutput', () => {
  beforeEach(() => {
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should produce an html report', () => {
    const outputJson = {
      summary: {
        totalRequests: 1,
        passedRequests: 1,
        failedRequests: 1,
        totalAssertions: 1,
        passedAssertions: 1,
        failedAssertions: 1,
        totalTests: 1,
        passedTests: 1,
        failedTests: 1
      },
      results: [
        {
          description: 'description provided',
          suitename: 'Tests/Suite A',
          request: {
            method: 'GET',
            url: 'https://ima.test'
          },
          assertionResults: [
            {
              lhsExpr: 'res.status',
              rhsExpr: 'eq 200',
              status: 'pass'
            },
            {
              lhsExpr: 'res.status',
              rhsExpr: 'neq 200',
              status: 'fail',
              error: 'expected 200 to not equal 200'
            }
          ],
          runtime: 1.2345678
        },
        {
          request: {
            method: 'GET',
            url: 'https://imanother.test'
          },
          suitename: 'Tests/Suite B',
          testResults: [
            {
              lhsExpr: 'res.status',
              rhsExpr: 'eq 200',
              description: 'A test that passes',
              status: 'pass'
            },
            {
              description: 'A test that fails',
              status: 'fail',
              error: 'expected 200 to not equal 200',
              status: 'fail'
            }
          ],
          runtime: 2.3456789
        }
      ]
    };

    makeHtmlOutput(outputJson, '/tmp/testfile.html');

    const htmlReport = fs.writeFileSync.mock.calls[0][1];
    expect(htmlReport).toContain(JSON.stringify(outputJson, null, 2));
  });
});
