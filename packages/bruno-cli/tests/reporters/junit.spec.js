const { describe, it, expect } = require('@jest/globals');
const xmlbuilder = require('xmlbuilder');
const fs = require('fs');

const makeJUnitOutput = require('../../src/reporters/junit');

describe('makeJUnitOutput', () => {
  let createStub = jest.fn();

  beforeEach(() => {
    jest.spyOn(xmlbuilder, 'create').mockImplementation(() => {
      return { end: createStub };
    });
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should produce a junit spec object for serialization', () => {
    const results = [
      {
        description: 'description provided',
        suitename: 'Tests/Suite A',
        request: {
          method: 'GET',
          url: 'https://ima.test',
          headers: {
            Authorization: 'Bearer your_secret_token'
          }
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8'
          },
          data: 'I am the response content'
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
    ];

    makeJUnitOutput(results, '/tmp/testfile.xml');
    expect(createStub).toBeCalled;

    const junit = xmlbuilder.create.mock.calls[0][0];

    expect(junit.testsuites).toBeDefined;
    expect(junit.testsuites.testsuite.length).toBe(2);
    expect(junit.testsuites.testsuite[0]['system-out']['#cdata']).toContain('> GET https://ima.test');
    expect(junit.testsuites.testsuite[0]['system-out']['#cdata']).toContain(
      '> Authorization: Bearer your_secret_token'
    );
    expect(junit.testsuites.testsuite[0]['system-out']['#cdata']).toContain('< 200 OK');
    expect(junit.testsuites.testsuite[0]['system-out']['#cdata']).toContain(
      '< Content-Type: text/plain; charset=utf-8'
    );
    expect(junit.testsuites.testsuite[0]['system-out']['#cdata']).toContain('I am the response content');
    expect(junit.testsuites.testsuite[0].testcase.length).toBe(2);
    expect(junit.testsuites.testsuite[1].testcase.length).toBe(2);

    expect(junit.testsuites.testsuite[0]['@name']).toBe('Tests/Suite A');
    expect(junit.testsuites.testsuite[1]['@name']).toBe('Tests/Suite B');

    expect(junit.testsuites.testsuite[0]['@tests']).toBe(2);
    expect(junit.testsuites.testsuite[1]['@tests']).toBe(2);

    const testcase = junit.testsuites.testsuite[0].testcase[0];

    expect(testcase['@name']).toBe('res.status eq 200');
    expect(testcase['@status']).toBe('pass');

    const failcase = junit.testsuites.testsuite[0].testcase[1];

    expect(failcase['@name']).toBe('res.status neq 200');
    expect(failcase.failure).toBeDefined;
    expect(failcase.failure[0]['@type']).toBe('failure');
  });

  it('should handle request errors', () => {
    const results = [
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
            status: 'fail'
          }
        ],
        runtime: 1.2345678,
        error: 'timeout of 2000ms exceeded'
      }
    ];

    makeJUnitOutput(results, '/tmp/testfile.xml');

    const junit = xmlbuilder.create.mock.calls[0][0];

    expect(createStub).toBeCalled;

    expect(junit.testsuites).toBeDefined;
    expect(junit.testsuites.testsuite.length).toBe(1);
    expect(junit.testsuites.testsuite[0].testcase.length).toBe(1);

    const failcase = junit.testsuites.testsuite[0].testcase[0];

    expect(failcase['@name']).toBe('Test suite has no errors');
    expect(failcase.error).toBeDefined;
    expect(failcase.error[0]['@type']).toBe('error');
    expect(failcase.error[0]['@message']).toBe('timeout of 2000ms exceeded');
  });
});
