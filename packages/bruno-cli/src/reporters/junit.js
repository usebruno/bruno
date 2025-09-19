const os = require('os');
const fs = require('fs');
const xmlbuilder = require('xmlbuilder');

const makeJUnitOutput = async (results, outputPath) => {
  const output = {
    testsuites: {
      testsuite: []
    }
  };

  results.forEach((result) => {
    const assertionTestCount = result.assertionResults ? result.assertionResults.length : 0;
    const testCount = result.testResults ? result.testResults.length : 0;
    const totalTests = assertionTestCount + testCount;

    const suite = {
      '@name': result.suitename,
      '@errors': 0,
      '@failures': 0,
      '@skipped': 0,
      '@tests': totalTests,
      '@timestamp': new Date().toISOString().split('Z')[0],
      '@hostname': os.hostname(),
      '@time': result.runtime.toFixed(3),
      testcase: []
    };

    result.assertionResults &&
      result.assertionResults.forEach((assertion) => {
        const testcase = {
          '@name': `${assertion.lhsExpr} ${assertion.rhsExpr}`,
          '@status': assertion.status,
          '@classname': result.request.url,
          '@time': (result.runtime / totalTests).toFixed(3)
        };

        if (assertion.status === 'fail') {
          suite['@failures']++;

          testcase.failure = [{ '@type': 'failure', '@message': assertion.error }];
        }

        suite.testcase.push(testcase);
      });

    result.testResults &&
      result.testResults.forEach((test) => {
        const testcase = {
          '@name': test.description,
          '@status': test.status,
          '@classname': result.request.url,
          '@time': (result.runtime / totalTests).toFixed(3)
        };

        if (test.status === 'fail') {
          suite['@failures']++;

          testcase.failure = [{ '@type': 'failure', '@message': test.error }];
        }

        suite.testcase.push(testcase);
      });

    if (result?.skipped) {
      suite['@skipped'] = 1;
    }
    else if (result.error) {
      suite['@errors'] = 1;
      suite['@tests'] = 1;
      suite.testcase = [
        {
          '@name': 'Test suite has no errors',
          '@status': 'fail',
          '@classname': result.request.url,
          '@time': result.runtime.toFixed(3),
          error: [{ '@type': 'error', '@message': result.error }]
        }
      ];
    }

    output.testsuites.testsuite.push(suite);
  });

  fs.writeFileSync(outputPath, xmlbuilder.create(output).end({ pretty: true }));
};

module.exports = makeJUnitOutput;
