import React, { useState, useEffect } from 'react';
import StyledWrapper from './StyledWrapper';
import { 
  IconChevronDown, 
  IconChevronRight, 
  IconCircleCheck, 
  IconCircleX 
} from '@tabler/icons';

const TestSection = ({ 
  title, 
  results, 
  isExpanded, 
  onToggle, 
  renderResultItem,
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
              {renderResultItem(result)}
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

  // Render function for standard test results
  const renderStandardTestResult = (result) => (
    result.status === 'pass' ? (
      <span className="test-success">&#x2714;&nbsp; {result.description}</span>
    ) : (
      <>
        <span className="test-failure">&#x2718;&nbsp; {result.description}</span>
        <br />
        <span className="error-message pl-8">{result.error}</span>
      </>
    )
  );

  // Render function for assertion results
  const renderAssertionResult = (result) => (
    result.status === 'pass' ? (
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
    )
  );
  
  if (!results.length && !assertionResults.length && !preRequestTestResults.length && !postResponseTestResults.length) {
    return <div className="px-3">No tests found</div>;
  }

  return (
    <StyledWrapper className="flex flex-col">
      <TestSection
        title="Pre-Request Tests"
        results={preRequestTestResults}
        isExpanded={expandedSections.preRequest}
        onToggle={() => toggleSection('preRequest')}
        renderResultItem={renderStandardTestResult}
      />

      <TestSection
        title="Post-Response Tests"
        results={postResponseTestResults}
        isExpanded={expandedSections.postResponse}
        onToggle={() => toggleSection('postResponse')}
        renderResultItem={renderStandardTestResult}
      />

      <TestSection
        title="Tests"
        results={results}
        isExpanded={expandedSections.tests}
        onToggle={() => toggleSection('tests')}
        renderResultItem={renderStandardTestResult}
      />

      <TestSection
        title="Assertions"
        results={assertionResults}
        isExpanded={expandedSections.assertions}
        onToggle={() => toggleSection('assertions')}
        renderResultItem={renderAssertionResult}
      />
    </StyledWrapper>
  );
};

export default TestResults;
