import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import {
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX
} from '@tabler/icons';

const ResultIcon = ({ status }) => {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center ${status === 'pass' ? 'test-success' : 'test-failure'}`}>
      {status === 'pass' ? (
        <IconCircleCheck size={14} className="mr-1" aria-label={t('RESPONSE_PANE.TEST_PASSED')} />
      ) : (
        <IconCircleX size={14} className="mr-1" aria-label={t('RESPONSE_PANE.TEST_FAILED')} />
      )}
    </span>
  );
};

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
  const { t } = useTranslation();
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
          {title} ({results.length}), {t('RESPONSE_PANE.PASSED')}: {passedResults.length}, {t('RESPONSE_PANE.FAILED')}: {failedResults.length}
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

const TestResults = ({ item, results, assertionResults, preRequestTestResults, postResponseTestResults }) => {
  const { t } = useTranslation();
  results = results || [];
  assertionResults = assertionResults || [];
  preRequestTestResults = preRequestTestResults || [];
  postResponseTestResults = postResponseTestResults || [];

  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `response-tests-scroll-${item?.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.response-tab-content', onChange: setScroll, initialValue: scroll });

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
    <StyledWrapper className="flex flex-col" ref={wrapperRef}>
      <TestSection
        title={t('RESPONSE_PANE.PRE_REQUEST_TESTS')}
        results={preRequestTestResults}
        isExpanded={expandedSections.preRequest}
        onToggle={() => toggleSection('preRequest')}
        type="test"
      />

      <TestSection
        title={t('RESPONSE_PANE.POST_RESPONSE_TESTS')}
        results={postResponseTestResults}
        isExpanded={expandedSections.postResponse}
        onToggle={() => toggleSection('postResponse')}
        type="test"
      />

      <TestSection
        title={t('RESPONSE_PANE.TESTS')}
        results={results}
        isExpanded={expandedSections.tests}
        onToggle={() => toggleSection('tests')}
        type="test"
      />

      <TestSection
        title={t('RESPONSE_PANE.ASSERTIONS')}
        results={assertionResults}
        isExpanded={expandedSections.assertions}
        onToggle={() => toggleSection('assertions')}
        type="assertion"
      />
    </StyledWrapper>
  );
};

export default TestResults;
