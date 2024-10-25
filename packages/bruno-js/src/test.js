const Test = (__brunoTestResults, chai) => async (description, callback) => {
  try {
    await callback();
    __brunoTestResults.addResult({ description, status: 'pass' });
  } catch (error) {
    if (error instanceof chai.AssertionError) {
      const { message, actual, expected } = error;
      __brunoTestResults.addResult({
        description,
        status: 'fail',
        error: message,
        actual,
        expected
      });
    } else {
      const errorStackLines = error?.stack?.split?.("\n");
      const lineInfo = errorStackLines?.[1];
      const lineNumber = lineInfo?.split(':')?.at?.(-2);
      const columnNumber = lineInfo?.split(':')?.at?.(-1);
      __brunoTestResults.addResult({
        description,
        status: 'fail',
        error: [
          `Error occurred at line ${lineNumber} and character ${columnNumber}`,
          `${error.message || 'An unexpected error occurred.'}`
        ]
      });
    }
    console.log(error);
  }
};

module.exports = Test;
