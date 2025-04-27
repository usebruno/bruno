import { T_RunnerResults } from "../../types";
import { T_JUnitReport, T_JUnitTestcase, T_JUnitTestSuite } from "../../types/junit-reports";

const generateJunitReport = ({
  runnerResults,
  config
}: {
  runnerResults: T_RunnerResults[];
  config: {
    hostname: string;
  };
}) => {
  const { hostname } = config;

  const output: T_JUnitReport = {
    testsuites: {
      testsuite: []
    }
  };

  runnerResults.forEach(({ results }) => {
    results.forEach((result) => {
      const assertionTestCount = result.assertionResults ? result.assertionResults.length : 0;
      const testCount = result.testResults ? result.testResults.length : 0;
      const totalTests = assertionTestCount + testCount;

      const suite: T_JUnitTestSuite = {
        '@name': result?.path,
        '@errors': 0,
        '@failures': 0,
        '@skipped': 0,
        '@tests': totalTests,
        '@timestamp': new Date().toISOString().split('Z')[0],
        '@hostname': hostname,
        '@time': result.runDuration.toFixed(3),
        '@classname': result?.request?.url ?? '',
        testcase: []
      };

      result.assertionResults &&
        result.assertionResults?.forEach((assertion) => {
          const testcase: T_JUnitTestcase = {
            '@name': `${assertion.lhsExpr} ${assertion.rhsExpr}`,
            '@status': assertion.status,
            '@classname': result?.request?.url ?? '',
            '@time': (result.runDuration / totalTests).toFixed(3)
          };

          if ('error' in assertion && assertion.status === 'fail') {
            suite['@failures']++;

            testcase.failure = [{ '@type': 'failure', '@message': assertion.error }];
          }

          suite.testcase.push(testcase);
        });

      result.testResults &&
        result.testResults?.forEach((test) => {
          const testcase: T_JUnitTestcase = {
            '@name': test.description,
            '@status': test.status,
            '@classname': result?.request?.url ?? '',
            '@time': (result.runDuration / totalTests).toFixed(3)
          };

          if ('error' in test && test.status === 'fail') {
            suite['@failures']++;

            testcase.failure = [{ '@type': 'failure', '@message': test.error }];
          }

          suite.testcase.push(testcase);
        });

      if (result.status == 'skipped') {
        suite['@skipped'] = 1;
      }
      else if (result.error) {
        suite['@errors'] = 1;
        suite['@tests'] = 1;
        suite.testcase = [{
          '@name': `Test suite has no errors`,
          '@status': 'fail',
          '@classname': result?.request?.url ?? '',
          '@time': result.runDuration.toFixed(3),
          error: [{ '@type': 'error', '@message': result.error }]
        }];
      }

      output.testsuites.testsuite.push(suite);
    });
  });

  return output;
};

export {
  generateJunitReport
}