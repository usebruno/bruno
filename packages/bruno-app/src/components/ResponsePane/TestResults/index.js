import React from 'react';
import StyledWrapper from './StyledWrapper';

const TestResults = ({ results, assertionResults }) => {
  results = results || [];
  assertionResults = assertionResults || [];
  if (!results.length && !assertionResults.length) {
    return <div className="px-3">No tests found</div>;
  }

  const passedTests = results.filter((result) => result.status === 'pass');
  const failedTests = results.filter((result) => result.status === 'fail');

  const passedAssertions = assertionResults.filter((result) => result.status === 'pass');
  const failedAssertions = assertionResults.filter((result) => result.status === 'fail');

  return (
    <StyledWrapper className="flex flex-col">
      <div className="pb-2 font-medium test-summary">
        Tests ({results.length}/{results.length}), Passed: {passedTests.length}, Failed: {failedTests.length}
      </div>
      <ul className="">
        {results.map((result) => (
          <li key={result.uid} className="py-1">
            {result.status === 'pass' ? (
              <span className="test-success">&#x2714;&nbsp; {result.description}</span>
            ) : (
              <>
                <span className="test-failure">&#x2718;&nbsp; {result.description}</span>
                <br />
                {Array.isArray(result?.error)? (
                    result?.error?.map(error=><><span className="error-message pl-8">{error}</span><br/></>)
                ) : (
                  <span className="error-message pl-8">{result.error}</span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="py-2 font-medium test-summary">
        Assertions ({assertionResults.length}/{assertionResults.length}), Passed: {passedAssertions.length}, Failed:{' '}
        {failedAssertions.length}
      </div>
      <ul className="">
        {assertionResults.map((result) => (
          <li key={result.uid} className="py-1">
            {result.status === 'pass' ? (
              <span className="test-success">
                &#x2714;&nbsp; {result.lhsExpr}: {result.rhsExpr}
              </span>
            ) : (
              <>
                <span className="test-failure">
                  &#x2718;&nbsp; {result.lhsExpr}: {result.rhsExpr}
                </span>
                <br />
                <span className="error-message pl-8">{result.error}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </StyledWrapper>
  );
};

export default TestResults;
