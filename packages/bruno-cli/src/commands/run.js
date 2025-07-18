const chalk = require('chalk');
const { runCollection } = require('../runner/bruno-runner');
const { rpad } = require('../utils/common');
const constants = require('../constants');
const { BrunoError } = require('../utils/bruno-error');
const command = 'run [paths...]';
const desc = 'Run one or more requests/folders';

const formatTestSummary = (label, maxLength, passed, failed, total, errorCount = 0, skippedCount = 0) => {
  const parts = [
    `${rpad(label, maxLength)} ${chalk.green(`${passed} passed`)}`
  ];

  if (failed > 0) parts.push(chalk.red(`${failed} failed`));
  if (errorCount > 0) parts.push(chalk.red(`${errorCount} error`));
  if (skippedCount > 0) parts.push(chalk.magenta(`${skippedCount} skipped`));

  parts.push(`${total} total`);

  return parts.join(', ');
};

const printRunSummary = (summary) => {
  const {
    totalRequests,
    passedRequests,
    failedRequests,
    skippedRequests,
    errorRequests,
    totalAssertions,
    passedAssertions,
    failedAssertions,
    totalTests,
    passedTests,
    failedTests,
    totalPreRequestTests,
    passedPreRequestTests,
    failedPreRequestTests,
    totalPostResponseTests,
    passedPostResponseTests,
    failedPostResponseTests
  } = summary;

  const maxLength = 12;

  const requestSummary = formatTestSummary('Requests:', maxLength, passedRequests, failedRequests, totalRequests, errorRequests, skippedRequests);
  const testSummary = formatTestSummary('Tests:', maxLength, passedTests, failedTests, totalTests);
  const assertSummary = formatTestSummary('Assertions:', maxLength, passedAssertions, failedAssertions, totalAssertions);

  let preRequestTestSummary = '';
  if (totalPreRequestTests > 0) {
    preRequestTestSummary = formatTestSummary('Pre-Request Tests:', maxLength, passedPreRequestTests, failedPreRequestTests, totalPreRequestTests);
  }

  let postResponseTestSummary = '';
  if (totalPostResponseTests > 0) {
    postResponseTestSummary = formatTestSummary('Post-Response Tests:', maxLength, passedPostResponseTests, failedPostResponseTests, totalPostResponseTests);
  }

  console.log('\n' + chalk.bold(requestSummary));
  if (preRequestTestSummary) {
    console.log(chalk.bold(preRequestTestSummary));
  }
  if (postResponseTestSummary) {
    console.log(chalk.bold(postResponseTestSummary));
  }
  console.log(chalk.bold(testSummary));
  console.log(chalk.bold(assertSummary));

  return {
    totalRequests,
    passedRequests,
    failedRequests,
    skippedRequests,
    errorRequests,
    totalAssertions,
    passedAssertions,
    failedAssertions,
    totalTests,
    passedTests,
    failedTests,
    totalPreRequestTests,
    passedPreRequestTests,
    failedPreRequestTests,
    totalPostResponseTests,
    passedPostResponseTests,
    failedPostResponseTests
  }
};
const builder = async (yargs) => {
  yargs
    .option('r', {
      describe: 'Indicates a recursive run',
      type: 'boolean',
      default: false
    })
    .option('cacert', {
      type: 'string',
      description: 'CA certificate to verify peer against'
    })
    .option('ignore-truststore', {
      type: 'boolean',
      default: false,
      description:
        'The specified custom CA certificate (--cacert) will be used exclusively and the default truststore is ignored, if this option is specified. Evaluated in combination with "--cacert" only.'
    })
    .option('disable-cookies', {
      type: 'boolean',
      default: false,
      description: 'Automatically save and sent cookies with requests'
    })
    .option('env', {
      describe: 'Environment variables',
      type: 'string'
    })
    .option('env-file', {
      describe: 'Path to environment file (.bru) - can be absolute or relative path',
      type: 'string'
    })
    .option('env-var', {
      describe: 'Overwrite a single environment variable, multiple usages possible',
      type: 'string'
    })
    .option('sandbox', {
      describe: 'Javascript sandbox to use; available sandboxes are "developer" (default) or "safe"',
      default: 'developer',
      type: 'string'
    })
    .option('output', {
      alias: 'o',
      describe: 'Path to write file results to',
      type: 'string'
    })
    .option('format', {
      alias: 'f',
      describe: 'Format of the file results; available formats are "json" (default), "junit" or "html"',
      default: 'json',
      type: 'string'
    })
    .option('reporter-json', {
      describe: 'Path to write json file results to',
      type: 'string'
    })
    .option('reporter-junit', {
      describe: 'Path to write junit file results to',
      type: 'string'
    })
    .option('reporter-html', {
      describe: 'Path to write html file results to',
      type: 'string'
    })
    .option('insecure', {
      type: 'boolean',
      description: 'Allow insecure server connections'
    })
    .option('tests-only', {
      type: 'boolean',
      description: 'Only run requests that have a test or active assertion'
    })
    .option('bail', {
      type: 'boolean',
      description: 'Stop execution after a failure of a request, test, or assertion'
    })
    .option('reporter-skip-all-headers', {
      type: 'boolean',
      description: 'Omit headers from the reporter output',
      default: false
    })
    .option('reporter-skip-headers', {
      type: 'array',
      description: 'Skip specific headers from the reporter output',
      default: []
    })
    .option('client-cert-config', {
      type: 'string',
      description: 'Path to the Client certificate config file used for securing the connection in the request'
    })
    .option('--noproxy', {
      type: 'boolean',
      description: 'Disable all proxy settings (both collection-defined and system proxies)',
      default: false
    })
    .option('delay', {
      type:"number",
      description: "Delay between each requests (in miliseconds)"
    })
    .option('collection', {
      type: 'string',
      description: 'Path to the collection directory',
      default: process.cwd()
    })
    .example('$0 run request.bru', 'Run a request')
    .example('$0 run request.bru --env local', 'Run a request with the environment set to local')
    .example('$0 run request.bru --env-file env.bru', 'Run a request with the environment from env.bru file')
    .example('$0 run folder', 'Run all requests in a folder')
    .example('$0 run folder -r', 'Run all requests in a folder recursively')
    .example('$0 run request.bru folder', 'Run a request and all requests in a folder')
    .example('$0 run --reporter-skip-all-headers', 'Run all requests in a folder recursively with omitted headers from the reporter output')
    .example(
      '$0 run --reporter-skip-headers "Authorization"',
      'Run all requests in a folder recursively with skipped headers from the reporter output'
    )
    .example(
      '$0 run request.bru --env local --env-var secret=xxx',
      'Run a request with the environment set to local and overwrite the variable secret with value xxx'
    )
    .example(
      '$0 run request.bru --output results.json',
      'Run a request and write the results to results.json in the current directory'
    )
    .example(
      '$0 run request.bru --output results.xml --format junit',
      'Run a request and write the results to results.xml in junit format in the current directory'
    )
    .example(
      '$0 run request.bru --output results.html --format html',
      'Run a request and write the results to results.html in html format in the current directory'
    )
    .example(
      '$0 run request.bru --reporter-junit results.xml --reporter-html results.html',
      'Run a request and write the results to results.html in html format and results.xml in junit format in the current directory'
    )
    .example('$0 run request.bru --tests-only', 'Run all requests that have a test')
    .example(
      '$0 run request.bru --cacert myCustomCA.pem',
      'Use a custom CA certificate in combination with the default truststore when validating the peer of this request.'
    )
    .example(
      '$0 run folder --cacert myCustomCA.pem --ignore-truststore',
      'Use a custom CA certificate exclusively when validating the peers of the requests in the specified folder.'
    )
    .example('$0 run --client-cert-config client-cert-config.json', 'Run a request with Client certificate configurations')
    .example('$0 run folder --delay delayInMs', 'Run a folder with given miliseconds delay between each requests.')
    .example('$0 run --noproxy', 'Run requests with system proxy disabled')
    .example('$0 run --collection /path/to/collection', 'Run requests from a specific collection directory');
};

const handler = async function (argv) {
  try {
    let {
      paths,
      cacert,
      ignoreTruststore,
      disableCookies,
      env,
      envFile,
      envVar,
      insecure,
      r: recursive,
      output: outputPath,
      format,
      reporterJson,
      reporterJunit,
      reporterHtml,
      sandbox,
      testsOnly,
      bail,
      reporterSkipAllHeaders,
      reporterSkipHeaders,
      clientCertConfig,
      noproxy,
      delay,
      collection: collectionDir
    } = argv;

    const collectionPath = collectionDir || process.cwd();

    // Validate output format
    if (['json', 'junit', 'html'].indexOf(format) === -1) {
      console.error(chalk.red(`Format must be one of "json", "junit or "html"`));
      process.exit(constants.EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT);
    }

    // Setup output formats
    let formats = {};
    if (outputPath && outputPath.length) {
      formats[format] = outputPath;
    }
    if (reporterHtml && reporterHtml.length) {
      formats['html'] = reporterHtml;
    }
    if (reporterJson && reporterJson.length) {
      formats['json'] = reporterJson;
    }
    if (reporterJunit && reporterJunit.length) {
      formats['junit'] = reporterJunit;
    }

    // Run the collection using the library
    const runnerOptions = {
      paths,
      collectionPath,
      recursive,
      env,
      envFile,
      envVar,
      testsOnly,
      bail,
      sandbox,
      insecure,
      disableCookies,
      noproxy,
      cacert,
      ignoreTruststore,
      clientCertConfig,
      delay,
      reporterSkipAllHeaders,
      reporterSkipHeaders,
      generateReports: formats
    };

    const { summary, totalTime } = await runCollection(runnerOptions);

    // Print summary
    const summaryOutput = printRunSummary(summary);
    console.log(chalk.dim(chalk.grey(`Ran all requests - ${totalTime} ms`)));

    // Log report generation (reports are now generated by the runner)
    const formatKeys = Object.keys(formats);
    if (formatKeys && formatKeys.length > 0) {
      for (const formatter of Object.keys(formats)) {
        const reportPath = formats[formatter];
        if (reportPath && reportPath.length > 0) {
          console.log(chalk.dim(chalk.grey(`Wrote ${formatter} results to ${reportPath}`)));
        }
      }
    }

    // Exit with appropriate code based on results
    if ((summaryOutput.failedAssertions + summaryOutput.failedTests + summaryOutput.failedPreRequestTests + summaryOutput.failedPostResponseTests + summaryOutput.failedRequests > 0) || (summaryOutput?.errorRequests > 0)) {
      process.exit(constants.EXIT_STATUS.ERROR_FAILED_COLLECTION);
    }
  } catch (err) {
    console.log('Something went wrong');
    console.error(chalk.red(err.message));

    // Use specific exit code if it's a BrunoError, otherwise use generic
    const exitCode = (err instanceof BrunoError && err.exitCode !== null)
      ? err.exitCode
      : constants.EXIT_STATUS.ERROR_GENERIC;

    process.exit(exitCode);
  }
};

module.exports = {
  command,
  desc,
  builder,
  handler,
  printRunSummary
};
