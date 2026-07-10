import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconInfoCircle } from '@tabler/icons';
import { clearMockLog, syncMockServerState } from 'providers/ReduxStore/slices/mock-server';
import { subscribeMockServerLog } from 'utils/mock-server-log-subscription';
import FilterDropdown from 'components/FilterDropdown';
import StyledWrapper from './StyledWrapper';

const getStatusClass = (statusCode, matched) => {
  if (!matched) return 'status-unmatched';
  if (statusCode >= 200 && statusCode < 300) return 'status-2xx';
  if (statusCode >= 300 && statusCode < 400) return 'status-3xx';
  if (statusCode >= 400 && statusCode < 500) return 'status-4xx';
  if (statusCode >= 500) return 'status-5xx';
  return '';
};

const formatTimestamp = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      + '.' + String(d.getMilliseconds()).padStart(3, '0');
  } catch {
    return iso;
  }
};

const formatConditionValue = (value) => {
  if (value === null || value === undefined) {
    return '(missing)';
  }

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  return String(value);
};

const formatCondition = (condition) => {
  if (!condition?.target) {
    return 'No rules (fallback)';
  }

  const key = condition.key ? ` ${condition.key}` : '';
  return `${condition.target}${key} ${condition.operator} ${formatConditionValue(condition.expected)}`;
};

const getSelectionReasonLabel = (selectionReason) => {
  if (selectionReason === 'specific_rules') {
    return 'Selected because specific rules matched';
  }

  if (selectionReason === 'fallback') {
    return 'Selected as fallback response';
  }

  return null;
};

const getMatchedMockResponseName = (entry) => (
  entry?.matchedMockResponseName
  || entry?.matchedExampleName
  || entry?.matchTrace?.selectedResponseName
  || null
);

const getFailureLabel = (failureReason) => {
  if (failureReason === 'no_route') {
    return 'No route matched this request';
  }

  if (failureReason === 'no_rule_match') {
    return 'Route matched, but no response rules passed';
  }

  return null;
};

const MatchTracePanel = ({ entry }) => {
  const trace = entry?.matchTrace;

  if (!trace) {
    return (
      <div className="match-trace-panel" data-testid="mock-server-match-trace">
        <div className="match-trace-empty">No match trace for this entry.</div>
      </div>
    );
  }

  const failureLabel = getFailureLabel(trace.failureReason);
  const selectionReasonLabel = getSelectionReasonLabel(trace.selectionReason);

  return (
    <div className="match-trace-panel" data-testid="mock-server-match-trace">
      <div className="match-trace-header">
        <span className="match-trace-route">{trace.routeKey || `${entry.method} ${entry.path}`}</span>
        {entry.matched
          ? (
              <span className="match-trace-result match-trace-result-success">
                Matched: {trace.selectedResponseName || getMatchedMockResponseName(entry)}
                {selectionReasonLabel ? ` (${selectionReasonLabel})` : ''}
              </span>
            )
          : <span className="match-trace-result match-trace-result-fail">{failureLabel || 'No match'}</span>}
      </div>

      {trace.availableRoutes?.length ? (
        <div className="match-trace-section">
          <div className="match-trace-section-title">Available routes</div>
          <ul className="match-trace-list">
            {trace.availableRoutes.map((route) => (
              <li key={route}>{route}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {trace.candidates?.length ? (
        <div className="match-trace-section">
          <div className="match-trace-section-title">Responses considered</div>
          {trace.candidates.map((candidate) => (
            <div
              key={candidate.responseUid || candidate.responseName}
              className={`match-trace-candidate ${candidate.selected ? 'is-selected' : ''}`}
            >
              <div className="match-trace-candidate-header">
                <span>{candidate.responseName}</span>
                {candidate.isFallback ? <span className="match-trace-badge">fallback</span> : null}
                {candidate.selected ? <span className="match-trace-badge selected">selected</span> : null}
                {candidate.matched && !candidate.selected ? (
                  <span className="match-trace-badge skipped">matched, not selected</span>
                ) : null}
              </div>

              {candidate.conditions?.length ? (
                <ul className="match-trace-conditions">
                  {candidate.conditions.map((condition, index) => (
                    <li
                      key={`${candidate.responseUid || candidate.responseName}-${index}`}
                      className={condition.pass ? 'pass' : 'fail'}
                    >
                      <span className="match-trace-condition-status">{condition.pass ? 'pass' : 'fail'}</span>
                      <span>{formatCondition(condition)}</span>
                      {!condition.pass ? (
                        <span className="match-trace-actual">got {formatConditionValue(condition.actual)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="match-trace-fallback-note">Matches any request on this route</div>
              )}

              {!candidate.matched && candidate.ruleOperator && candidate.conditions?.length ? (
                <div className="match-trace-operator">
                  Rule group: {candidate.ruleOperator}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const MATCH_FILTER_OPTIONS = [
  { value: 'matched', label: 'Matched' },
  { value: 'unmatched', label: 'Unmatched' }
];

const STATUS_FILTER_OPTIONS = [
  { value: '2xx', label: '2xx Success' },
  { value: '3xx', label: '3xx Redirect' },
  { value: '4xx', label: '4xx Client Error' },
  { value: '5xx', label: '5xx Server Error' }
];

const RequestLog = ({ mockServerUid }) => {
  const dispatch = useDispatch();
  const logs = useSelector((state) => state.mockServer.requestLogs[mockServerUid]) || [];
  const [matchFilter, setMatchFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [expandedLogUid, setExpandedLogUid] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeMockServerLog(mockServerUid);
    dispatch(syncMockServerState({ mockServerUid }));

    return unsubscribe;
  }, [dispatch, mockServerUid]);

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (matchFilter === 'matched' && !entry.matched) return false;
      if (matchFilter === 'unmatched' && entry.matched) return false;

      if (statusFilter) {
        const code = entry.statusCode;
        if (statusFilter === '2xx' && (code < 200 || code >= 300)) return false;
        if (statusFilter === '3xx' && (code < 300 || code >= 400)) return false;
        if (statusFilter === '4xx' && (code < 400 || code >= 500)) return false;
        if (statusFilter === '5xx' && (code < 500 || code >= 600)) return false;
      }

      return true;
    });
  }, [logs, matchFilter, statusFilter]);

  const displayedLogs = useMemo(() => [...filteredLogs].reverse(), [filteredLogs]);

  useEffect(() => {
    if (expandedLogUid && !displayedLogs.some((entry) => entry.uid === expandedLogUid)) {
      setExpandedLogUid(null);
    }
  }, [displayedLogs, expandedLogUid]);

  useEffect(() => {
    const latestEntry = displayedLogs[0];
    if (latestEntry?.matchTrace) {
      setExpandedLogUid(latestEntry.uid);
    }
  }, [displayedLogs.length, displayedLogs[0]?.uid]);

  const handleClear = () => {
    dispatch(clearMockLog({ mockServerUid }));
    setExpandedLogUid(null);
  };

  const toggleTrace = (uid) => {
    setExpandedLogUid((current) => (current === uid ? null : uid));
  };

  if (logs.length === 0) {
    return (
      <StyledWrapper className="h-full w-full">
        <div className="text-xs text-muted empty-state">
          No requests logged yet. Send requests to the mock server to see them here.
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="h-full w-full">
      <div className="flex items-center gap-2 mb-4">
        <FilterDropdown
          label="Match"
          options={MATCH_FILTER_OPTIONS}
          value={matchFilter}
          onChange={setMatchFilter}
          allLabel="All Requests"
          testId="mock-server-match-filter"
        />
        <FilterDropdown
          label="Status"
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          allLabel="All Status"
          testId="mock-server-status-filter"
        />
        <div className="flex-grow" />
        <span className="text-xs text-muted" data-testid="mock-server-log-count">{logs.length} requests</span>
        <button className="text-link select-none" onClick={handleClear} data-testid="mock-server-log-clear">
          Clear
        </button>
      </div>

      <div className="log-table-container">
        <table>
          <colgroup>
            <col style={{ width: '36px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '80px' }} />
            <col />
            <col style={{ width: '140px' }} />
            <col style={{ width: '70px' }} />
            <col style={{ width: '70px' }} />
            <col style={{ width: '80px' }} />
          </colgroup>
          <thead>
            <tr>
              <th aria-label="Match trace" />
              <th>Time</th>
              <th>Method</th>
              <th>Path</th>
              <th>Mock Response</th>
              <th>Status</th>
              <th>Delay</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {displayedLogs.map((entry) => {
              const isExpanded = expandedLogUid === entry.uid;

              return (
                <React.Fragment key={entry.uid}>
                  <tr className={isExpanded ? 'log-row-expanded' : undefined}>
                    <td>
                      <button
                        type="button"
                        className={`inspect-btn ${isExpanded ? 'is-active' : ''}`}
                        onClick={() => toggleTrace(entry.uid)}
                        aria-label="Show match trace"
                        aria-expanded={isExpanded}
                        data-testid={`mock-server-log-inspect-${entry.uid}`}
                      >
                        <IconInfoCircle size={16} stroke={1.5} />
                      </button>
                    </td>
                    <td><span className="log-timestamp">{formatTimestamp(entry.timestamp)}</span></td>
                    <td><span className={`method-badge ${(entry.method || '').toLowerCase()}`}>{entry.method}</span></td>
                    <td><span className="log-path">{entry.path}</span></td>
                    <td>
                      {entry.matched
                        ? <span>{getMatchedMockResponseName(entry) || '-'}</span>
                        : <span className="no-match-label">No Match</span>}
                    </td>
                    <td>
                      <span className={`status-code ${getStatusClass(entry.statusCode, entry.matched)}`}>
                        {entry.statusCode}
                      </span>
                    </td>
                    <td><span>{entry.delay > 0 ? `${entry.delay}ms` : '-'}</span></td>
                    <td><span>{entry.duration}ms</span></td>
                  </tr>
                  {isExpanded ? (
                    <tr className="log-trace-row">
                      <td colSpan={8}>
                        <MatchTracePanel entry={entry} />
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </StyledWrapper>
  );
};

export default RequestLog;
