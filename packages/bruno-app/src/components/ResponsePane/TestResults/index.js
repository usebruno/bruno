import React, { useState, useEffect } from 'react';
import StyledWrapper from './StyledWrapper';
import { 
  IconChevronDown, 
  IconChevronRight, 
  IconCircleCheck, 
  IconCircleX 
} from '@tabler/icons';

const TestResults = ({ results, assertionResults, preRequestTestResults, postResponseTestResults }) => {
  results = results || [];
  assertionResults = assertionResults || [];
  preRequestTestResults = preRequestTestResults || [];
  postResponseTestResults = postResponseTestResults || [];
  
  const passedTests = results.filter((result) => result.status === 'pass');
  const failedTests = results.filter((result) => result.status === 'fail');

  const passedAssertions = assertionResults.filter((result) => result.status === 'pass');
  const failedAssertions = assertionResults.filter((result) => result.status === 'fail');

  const passedPreRequestTests = preRequestTestResults.filter((result) => result.status === 'pass');
  const failedPreRequestTests = preRequestTestResults.filter((result) => result.status === 'fail');

  const passedPostResponseTests = postResponseTestResults.filter((result) => result.status === 'pass');
  const failedPostResponseTests = postResponseTestResults.filter((result) => result.status === 'fail');
  
  const [expandedSections, setExpandedSections] = useState({
    preRequest: true,
    tests: true,
    postResponse: true,
    assertions: true
  });
  
  // Update expanded sections when test results change
  useEffect(() => {
    setExpandedSections({
      preRequest: preRequestTestResults.length > 0,
      tests: results.length > 0,
      postResponse: postResponseTestResults.length > 0,
      assertions: assertionResults.length > 0
    });
  }, [results.length, assertionResults.length, preRequestTestResults.length, postResponseTestResults.length]);

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };
  
  if (!results.length && !assertionResults.length && !preRequestTestResults.length && !postResponseTestResults.length) {
    return <div className="px-3">No tests found</div>;
  }

  return (
    <StyledWrapper className="flex flex-col">
      {preRequestTestResults.length > 0 && (
        <div className="mb-4 test-section">
          <div 
            className="font-medium test-summary flex items-center cursor-pointer hover:bg-opacity-10 hover:bg-gray-500 rounded py-2" 
            onClick={() => toggleSection('preRequest')}
          >
            <span className="dropdown-icon mr-2 flex items-center">
              {expandedSections.preRequest ? 
                <IconChevronDown size={18} stroke={1.5} /> : 
                <IconChevronRight size={18} stroke={1.5} />
              }
            </span>
            <span className="flex-grow">
              Pre-Request Tests ({preRequestTestResults.length}/{preRequestTestResults.length}), Passed: {passedPreRequestTests.length}, Failed: {failedPreRequestTests.length}
            </span>
          </div>
          {expandedSections.preRequest && (
            <ul className="ml-5">
              {preRequestTestResults.map((result) => (
                <li key={result.uid} className="py-1">
                  {result.status === 'pass' ? (
                    <span className="test-success">&#x2714;&nbsp; {result.description}</span>
                  ) : (
                    <>
                      <span className="test-failure">&#x2718;&nbsp; {result.description}</span>
                      <br />
                      <span className="error-message pl-8">{result.error}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {postResponseTestResults.length > 0 && (
        <div className="mb-4 test-section">
          <div 
            className="font-medium test-summary flex items-center cursor-pointer hover:bg-opacity-10 hover:bg-gray-500 rounded py-2" 
            onClick={() => toggleSection('postResponse')}
          >
            <span className="dropdown-icon mr-2 flex items-center">
              {expandedSections.postResponse ? 
                <IconChevronDown size={18} stroke={1.5} /> : 
                <IconChevronRight size={18} stroke={1.5} />
              }
            </span>
            <span className="flex-grow">
              Post-Response Tests ({postResponseTestResults.length}/{postResponseTestResults.length}), Passed: {passedPostResponseTests.length}, Failed: {failedPostResponseTests.length}
            </span>
          </div>
          {expandedSections.postResponse && (
            <ul className="ml-5">
              {postResponseTestResults.map((result) => (
                <li key={result.uid} className="py-1">
                  {result.status === 'pass' ? (
                    <span className="test-success">&#x2714;&nbsp; {result.description}</span>
                  ) : (
                    <>
                      <span className="test-failure">&#x2718;&nbsp; {result.description}</span>
                      <br />
                      <span className="error-message pl-8">{result.error}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="mb-4 test-section">
          <div 
            className="font-medium test-summary flex items-center cursor-pointer hover:bg-opacity-10 hover:bg-gray-500 rounded py-2" 
            onClick={() => toggleSection('tests')}
          >
            <span className="dropdown-icon mr-2 flex items-center">
              {expandedSections.tests ? 
                <IconChevronDown size={18} stroke={1.5} /> : 
                <IconChevronRight size={18} stroke={1.5} />
              }
            </span>
            <span className="flex-grow">
              Tests ({results.length}/{results.length}), Passed: {passedTests.length}, Failed: {failedTests.length}
            </span>
          </div>
          {expandedSections.tests && (
            <ul className="ml-5">
              {results.map((result) => (
                <li key={result.uid} className="py-1">
                  {result.status === 'pass' ? (
                    <span className="test-success">&#x2714;&nbsp; {result.description}</span>
                  ) : (
                    <>
                      <span className="test-failure">&#x2718;&nbsp; {result.description}</span>
                      <br />
                      <span className="error-message pl-8">{result.error}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {assertionResults.length > 0 && (
        <div className="test-section">
          <div 
            className="font-medium test-summary flex items-center cursor-pointer hover:bg-opacity-10 hover:bg-gray-500 rounded py-2" 
            onClick={() => toggleSection('assertions')}
          >
            <span className="dropdown-icon mr-2 flex items-center">
              {expandedSections.assertions ? 
                <IconChevronDown size={18} stroke={1.5} /> : 
                <IconChevronRight size={18} stroke={1.5} />
              }
            </span>
            <span className="flex-grow">
              Assertions ({assertionResults.length}/{assertionResults.length}), Passed: {passedAssertions.length}, Failed: {failedAssertions.length}
            </span>
          </div>
          {expandedSections.assertions && (
            <ul className="ml-5">
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
          )}
        </div>
      )}
    </StyledWrapper>
  );
};

export default TestResults;
