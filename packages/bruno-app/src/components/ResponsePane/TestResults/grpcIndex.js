import React, { useState, useEffect, useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import {
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX
} from '@tabler/icons';

/**
 * The gRPC counterpart of ./index.js: a gRPC call has no Tests or Assert tab of its own — tests are
 * written with `test()` inside the four phase scripts and reported per phase — so these are the only
 * sections. The rows and sections below are a copy of the ones in ./index.js: a change to how a
 * result renders has to be made in both files.
 */

const ResultIcon = ({ status }) => (
  <span
    data-testid={status === 'pass' ? 'test-result-icon-pass' : 'test-result-icon-fail'}
    className={`inline-flex items-center ${status === 'pass' ? 'test-success' : 'test-failure'}`}
  >
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
  <div className="test-result-item" data-testid="test-result-item">
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
  sectionKey,
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
        data-testid={`test-results-summary-${sectionKey}`}
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

const GrpcTestResults = ({
  item,
  beforeCallStartTestResults,
  beforeMessageSendTestResults,
  afterMessageReceiveTestResults,
  afterCallEndTestResults
}) => {
  beforeCallStartTestResults = beforeCallStartTestResults || [];
  beforeMessageSendTestResults = beforeMessageSendTestResults || [];
  afterMessageReceiveTestResults = afterMessageReceiveTestResults || [];
  afterCallEndTestResults = afterCallEndTestResults || [];

  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `response-tests-scroll-${item?.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.response-tab-content', onChange: setScroll, initialValue: scroll });

  const [expandedSections, setExpandedSections] = useState({
    beforeCallStart: true,
    beforeMessageSend: true,
    afterMessageReceive: true,
    afterCallEnd: true
  });

  useEffect(() => {
    setExpandedSections({
      beforeCallStart: beforeCallStartTestResults.length > 0,
      beforeMessageSend: beforeMessageSendTestResults.length > 0,
      afterMessageReceive: afterMessageReceiveTestResults.length > 0,
      afterCallEnd: afterCallEndTestResults.length > 0
    });
  }, [beforeCallStartTestResults.length, beforeMessageSendTestResults.length, afterMessageReceiveTestResults.length, afterCallEndTestResults.length]);

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  if (!beforeCallStartTestResults.length && !beforeMessageSendTestResults.length && !afterMessageReceiveTestResults.length && !afterCallEndTestResults.length) {
    return <div>No tests found</div>;
  }

  return (
    <StyledWrapper className="flex flex-col" ref={wrapperRef}>
      <TestSection
        sectionKey="grpc:before-call-start"
        title="Before-Call Tests"
        results={beforeCallStartTestResults}
        isExpanded={expandedSections.beforeCallStart}
        onToggle={() => toggleSection('beforeCallStart')}
        type="test"
      />

      <TestSection
        sectionKey="grpc:before-message-send"
        title="Before-Message Tests"
        results={beforeMessageSendTestResults}
        isExpanded={expandedSections.beforeMessageSend}
        onToggle={() => toggleSection('beforeMessageSend')}
        type="test"
      />

      <TestSection
        sectionKey="grpc:after-message-receive"
        title="After-Message Tests"
        results={afterMessageReceiveTestResults}
        isExpanded={expandedSections.afterMessageReceive}
        onToggle={() => toggleSection('afterMessageReceive')}
        type="test"
      />

      <TestSection
        sectionKey="grpc:after-call-end"
        title="After-Call Tests"
        results={afterCallEndTestResults}
        isExpanded={expandedSections.afterCallEnd}
        onToggle={() => toggleSection('afterCallEnd')}
        type="test"
      />
    </StyledWrapper>
  );
};

export default GrpcTestResults;
