import React, { useState, useEffect, useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import { useTranslation } from 'react-i18next';
import {
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX
} from '@tabler/icons';

const ResultIcon = ({ status, t }) => (
  <span className={`inline-flex items-center ${status === 'pass' ? 'test-success' : 'test-failure'}`}>
    {status === 'pass' ? (
      <IconCircleCheck size={14} className="mr-1" aria-label={t('TEST_RESULTS.TEST_PASSED')} />
    ) : (
      <IconCircleX size={14} className="mr-1" aria-label={t('TEST_RESULTS.TEST_FAILED')} />
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

const ResultItem = ({ result, type, t }) => (
  <div className="test-result-item">
    <ResultIcon status={result.status} t={t} />
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
  type = 'test',
  t
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
          {title} ({results.length}), {t('TEST_RESULTS.PASSED')}: {passedResults.length}, {t('TEST_RESULTS.FAILED')}: {failedResults.length}
        </span>
      </div>
      {isExpanded && (
        <ul className="ml-5">
          {results.map((result) => (
            <li key={result.uid} className="py-1">
              <ResultItem result={result} type={type} t={t} />
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
    return <div>{t('TEST_RESULTS.NO_TESTS_FOUND')}</div>;
  }

  return (
    <StyledWrapper className="flex flex-col" ref={wrapperRef}>
      <TestSection
        title={t('TEST_RESULTS.PRE_REQUEST_TESTS')}
        results={preRequestTestResults}
        isExpanded={expandedSections.preRequest}
        onToggle={() => toggleSection('preRequest')}
        type="test"
        t={t}
      />

      <TestSection
        title={t('TEST_RESULTS.POST_RESPONSE_TESTS')}
        results={postResponseTestResults}
        isExpanded={expandedSections.postResponse}
        onToggle={() => toggleSection('postResponse')}
        type="test"
        t={t}
      />

      <TestSection
        title={t('TEST_RESULTS.TESTS')}
        results={results}
        isExpanded={expandedSections.tests}
        onToggle={() => toggleSection('tests')}
        type="test"
        t={t}
      />

      <TestSection
        title={t('TEST_RESULTS.ASSERTIONS')}
        results={assertionResults}
        isExpanded={expandedSections.assertions}
        onToggle={() => toggleSection('assertions')}
        type="assertion"
        t={t}
      />
    </StyledWrapper>
  );
};

export default TestResults;
