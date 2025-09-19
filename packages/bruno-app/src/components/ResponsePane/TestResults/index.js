import React, { useState, useEffect } from 'react';
import StyledWrapper from './StyledWrapper';
import {
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX
} from '@tabler/icons';

const ResultIcon = ({ status }) => (
  <span className={`inline-flex items-center ${status === 'pass' ? 'test-success' : 'test-failure'}`}>
    {status === 'pass' ? (
      <IconCircleCheck size={14} className="mr-1" aria-label="Test passed" />
    ) : (
      <IconCircleX size={14} className="mr-1" aria-label="Test failed" />
    )}
  </span>
);

const ErrorMessage = ({ error }) => error && (
  <>
    <br />
    <span className="error-message pl-8" role="alert">
      {error}
    </span>
  </>
);

const ResultItem = ({ result, type }) => (
  <div className="test-result-item">
    <ResultIcon status={result.status} />
    <span className={result.status === 'pass' ? 'test-success' : 'test-failure'}>
      {type === 'assertion'
        ? `${result.lhsExpr}: ${result.rhsExpr}`
        : result.description
      }
    </span>
    <ErrorMessage error={result.error} />
  </div>
);

const TestSection = ({
  title,
  results,
  isExpanded,
  onToggle,
  type = 'test'
}) => {
  const passedResults = results.filter((result) => result.status === 'pass');
  const failedResults = results.filter((result) => result.status === 'fail');

  if (results.length === 0) return null;

  return (
    <div className='mb-4'>
      <div
        className="font-medium test-summary flex items-center cursor-pointer hover:bg-opacity-10 hover:bg-gray-500 rounded py-2"
        onClick={onToggle}
      >
        <span className="dropdown-icon mr-2 flex items-center">
          {isExpanded ?
            <IconChevronDown size={18} stroke={1.5} /> :
            <IconChevronRight size={18} stroke={1.5} />
          }
        </span>
        <span className="flex-grow">
          {title} ({results.length}), Passed: {passedResults.length}, Failed: {failedResults.length}
        </span>
      </div>
      {isExpanded && (
        <ul className="ml-5">
          {results.map((result) => (
            <li key={result.uid} className="py-1">
              <ResultItem result={result} type={type} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const TestResults = ({ results, assertionResults, preRequestTestResults, postResponseTestResults }) => {
  results = results || [];
  assertionResults = assertionResults || [];
  preRequestTestResults = preRequestTestResults || [];
  postResponseTestResults = postResponseTestResults || [];

  const [expandedSections, setExpandedSections] = useState({
    preRequest: true,
    tests: true,
    postResponse: true,
    assertions: true
  });

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
    return <div>No tests found</div>;
  }

  return (
    <StyledWrapper className="flex flex-col">
      <TestSection
        title="Pre-Request Tests"
        results={preRequestTestResults}
        isExpanded={expandedSections.preRequest}
        onToggle={() => toggleSection('preRequest')}
        type="test"
      />

      <TestSection
        title="Post-Response Tests"
        results={postResponseTestResults}
        isExpanded={expandedSections.postResponse}
        onToggle={() => toggleSection('postResponse')}
        type="test"
      />

      <TestSection
        title="Tests"
        results={results}
        isExpanded={expandedSections.tests}
        onToggle={() => toggleSection('tests')}
        type="test"
      />

      <TestSection
        title="Assertions"
        results={assertionResults}
        isExpanded={expandedSections.assertions}
        onToggle={() => toggleSection('assertions')}
        type="assertion"
      />
    </StyledWrapper>
  );
};

export default TestResults;
