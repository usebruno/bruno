import globalChai from 'chai';

export const Test =
  (brunoTestResults: any, chai: typeof globalChai) =>
  async (description: string, callback: () => Promise<void> | void) => {
    try {
      await callback();
      brunoTestResults.addResult({ description, status: 'pass' });
    } catch (error) {
      if (error instanceof chai.AssertionError) {
        // @ts-expect-error Should work but actual & expected are not in the type
        const { message, actual, expected } = error;
        brunoTestResults.addResult({
          description,
          status: 'fail',
          error: message,
          actual,
          expected
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        brunoTestResults.addResult({
          description,
          status: 'fail',
          error: errorMessage
        });
      }
      console.log(`Error in your test: "${description}":`, error);
    }
  };
