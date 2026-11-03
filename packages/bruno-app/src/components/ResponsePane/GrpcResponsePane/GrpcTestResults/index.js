import React, { useState, useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import {
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX
} from '@tabler/icons';

export const buildGrpcTestSections = (item) => [
  { key: 'beforeCallStart', title: 'Before Call Start Tests', results: item.beforeCallStartTestResults || [] },
  { key: 'beforeMessageSend', title: 'Before Message Send Tests', results: item.beforeMessageSendTestResults || [] },
  { key: 'afterMessageReceive', title: 'After Message Receive Tests', results: item.afterMessageReceiveTestResults || [] },
  { key: 'afterCallEnd', title: 'After Call End Tests', results: item.afterCallEndTestResults || [] }
];

const groupResultsByMessage = (results) => {
  const groups = [];

  for (const result of results) {
    const last = groups[groups.length - 1];
    if (last && last.messageIndex === result.messageIndex) {
      last.results.push(result);
      continue;
    }
    groups.push({ messageIndex: result.messageIndex, results: [result] });
  }

  return groups;
};

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

const ResultItem = ({ result }) => (
  <div className="test-result-item" data-testid="test-result-item">
    <ResultIcon status={result.status} />
    <span className={result.status === 'pass' ? 'test-success' : 'test-failure'}>
      {result.description}
    </span>
    <ErrorMessage error={result.error} />
  </div>
);

const GrpcTestSection = ({ sectionKey, title, results, isExpanded, onToggle }) => {
  if (results.length === 0) return null;

  const passedCount = results.filter((result) => result.status === 'pass').length;
  const failedCount = results.length - passedCount;

  return (
    <div className="mb-4" data-testid={`grpc-test-section-${sectionKey}`}>
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
          {title} ({results.length}), Passed: {passedCount}, Failed: {failedCount}
        </span>
      </div>
      {isExpanded && groupResultsByMessage(results).map((group) => (
        <div key={group.messageIndex ?? 'call'}>
          {group.messageIndex !== undefined && (
            <div className="message-group-label ml-5" data-testid={`grpc-test-message-group-${group.messageIndex}`}>
              Message {group.messageIndex + 1}
            </div>
          )}
          <ul className="ml-5">
            {group.results.map((result) => (
              <li key={result.uid} className="py-1">
                <ResultItem result={result} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export const countGrpcTestResults = (sections) =>
  sections.reduce((total, section) => total + section.results.length, 0);

const GrpcTestResults = ({ item, sections }) => {
  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `grpc-response-tests-scroll-${item?.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.response-tab-content', onChange: setScroll, initialValue: scroll });

  const [userToggledSections, setUserToggledSections] = useState({});

  const isSectionExpanded = (section) => userToggledSections[section.key] ?? section.results.length > 0;

  const toggleSection = (section) => {
    setUserToggledSections({
      ...userToggledSections,
      [section.key]: !isSectionExpanded(section)
    });
  };

  if (!countGrpcTestResults(sections)) {
    return <div>No tests found</div>;
  }

  return (
    <StyledWrapper className="flex flex-col" ref={wrapperRef}>
      {sections.map((section) => (
        <GrpcTestSection
          key={section.key}
          sectionKey={section.key}
          title={section.title}
          results={section.results}
          isExpanded={isSectionExpanded(section)}
          onToggle={() => toggleSection(section)}
        />
      ))}
    </StyledWrapper>
  );
};

export default GrpcTestResults;
