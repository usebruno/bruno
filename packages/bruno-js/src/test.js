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
      __brunoTestResults.addResult({
        description,
        status: 'fail',
        error: [
          `${error.message || 'An unexpected error occurred.'}`,
          error?.stack
        ]
      });
    }
    console.log(error);
  }
};

module.exports = Test;
