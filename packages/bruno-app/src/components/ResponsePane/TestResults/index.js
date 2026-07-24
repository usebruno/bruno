import React, { useState, useRef } from 'react';
import { getPhasesByRequestType } from '@usebruno/common';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
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
        : result.description}
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
    <div className="mb-4">
      <div
        className="font-medium test-summary flex items-center cursor-pointer hover:bg-opacity-10 hover:bg-gray-500 rounded py-2"
        onClick={onToggle}
      >
        <span className="dropdown-icon mr-2 flex items-center">
          {isExpanded
            ? <IconChevronDown size={18} stroke={1.5} />
            : <IconChevronRight size={18} stroke={1.5} />}
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

const TestResults = ({ item }) => {
  const sections = [
    ...getPhasesByRequestType(item?.type).map(({ SCRIPT_TYPE, LABEL, TEST_RESULTS_KEY }) => ({
      key: SCRIPT_TYPE,
      title: `${LABEL.replace(/\s+/g, '-')} Tests`,
      results: item?.[TEST_RESULTS_KEY] || [],
      type: 'test'
    })),
    { key: 'tests', title: 'Tests', results: item?.testResults || [], type: 'test' },
    { key: 'assertions', title: 'Assertions', results: item?.assertionResults || [], type: 'assertion' }
  ];

  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `response-tests-scroll-${item?.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.response-tab-content', onChange: setScroll, initialValue: scroll });

  const [expandedSections, setExpandedSections] = useState({});
  const isExpanded = (section) => expandedSections[section.key] ?? section.results.length > 0;
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section.key]: !isExpanded(section) }));
  };

  if (!sections.some((section) => section.results.length)) {
    return <div>No tests found</div>;
  }

  return (
    <StyledWrapper className="flex flex-col" ref={wrapperRef}>
      {sections.map((section) => (
        <TestSection
          key={section.key}
          title={section.title}
          results={section.results}
          isExpanded={isExpanded(section)}
          onToggle={() => toggleSection(section)}
          type={section.type}
        />
      ))}
    </StyledWrapper>
  );
};

export default TestResults;
