const { rpad } = require('../utils/common');
const chalk = require('chalk');

const addToSummary = (results, results_to_add) => {
    results.totalRequests += results_to_add.totalRequests;
    results.passedRequests += results_to_add.passedRequests;
    results.failedRequests += results_to_add.failedRequests;
    results.skippedRequests += results_to_add.skippedRequests;
    results.errorRequests += results_to_add.errorRequests;
    results.totalAssertions += results_to_add.totalAssertions;
    results.passedAssertions += results_to_add.passedAssertions;
    results.failedAssertions += results_to_add.failedAssertions;
    results.totalTests += results_to_add.totalTests;
    results.passedTests += results_to_add.passedTests;
    results.failedTests += results_to_add.failedTests;
}

const printRunSummary = (results) => {
  const maxLength = 12;

  let requestSummary = `${rpad('Requests:', maxLength)} ${chalk.green(`${results.passedRequests} passed`)}`;
  if (results.failedRequests > 0) {
    requestSummary += `, ${chalk.red(`${results.failedRequests} failed`)}`;
  }
  if (results.errorRequests > 0) {
    requestSummary += `, ${chalk.red(`${results.errorRequests} error`)}`;
  }
  if (results.skippedRequests > 0) {
    requestSummary += `, ${chalk.magenta(`${results.skippedRequests} skipped`)}`;
  }
  requestSummary += `, ${results.totalRequests} total`;

  let assertSummary = `${rpad('Tests:', maxLength)} ${chalk.green(`${results.passedTests} passed`)}`;
  if (results.failedTests > 0) {
    assertSummary += `, ${chalk.red(`${results.failedTests} failed`)}`;
  }
  assertSummary += `, ${results.totalTests} total`;

  let testSummary = `${rpad('Assertions:', maxLength)} ${chalk.green(`${results.passedAssertions} passed`)}`;
  if (results.failedAssertions > 0) {
    testSummary += `, ${chalk.red(`${results.failedAssertions} failed`)}`;
  }
  testSummary += `, ${results.totalAssertions} total`;

  console.log('\n' + chalk.bold(requestSummary));
  console.log(chalk.bold(assertSummary));
  console.log(chalk.bold(testSummary));
};

module.exports = {
  printRunSummary,
  addToSummary,
};
