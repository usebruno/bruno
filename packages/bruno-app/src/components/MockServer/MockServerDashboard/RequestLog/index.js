import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconTrash } from '@tabler/icons';
import { clearMockLog, syncMockServerState } from 'providers/ReduxStore/slices/mock-server/index';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import { subscribeMockServerLog } from 'utils/mock-server/mock-server-log-subscription';
import EditableTable from 'components/EditableTable';
import FilterDropdown from 'components/FilterDropdown';
import Button from 'ui/Button';
import MethodBadge from 'ui/MethodBadge';
import StatusBadge from 'ui/StatusBadge';
import StyledWrapper from './StyledWrapper';

const getStatusBucket = (statusCode) => {
  if (statusCode >= 200 && statusCode < 300) return '2xx';
  if (statusCode >= 300 && statusCode < 400) return '3xx';
  if (statusCode >= 400 && statusCode < 500) return '4xx';
  if (statusCode >= 500 && statusCode < 600) return '5xx';
  return null;
};

const getStatusClass = (statusCode, matched) => {
  if (!matched) return 'status-unmatched';

  const bucket = getStatusBucket(statusCode);
  return bucket ? `status-${bucket}` : '';
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
  const failureLabel = trace ? getFailureLabel(trace.failureReason) : null;
  const routeLabel = trace ? (trace.routeKey || `${entry.method} ${entry.path}`) : null;

  return (
    <div className="match-trace-panel" data-testid="mock-server-match-trace">
      {entry?.error ? (
        <div className="match-trace-error" data-testid="mock-server-log-error">{entry.error}</div>
      ) : null}

      {!trace && !entry?.error ? (
        <div className="match-trace-empty">No match trace for this entry.</div>
      ) : null}

      {trace ? (
        <div className="match-trace-header">
          <span className="match-trace-route">{routeLabel}</span>
          {entry.matched
            ? (
                <span className="match-trace-result match-trace-result-success">
                  Matched: {trace.selectedResponseName || getMatchedMockResponseName(entry)}
                </span>
              )
            : <span className="match-trace-result match-trace-result-fail">{failureLabel || 'No match'}</span>}
        </div>
      ) : null}

      {trace?.availableRoutes?.length ? (
        <div className="match-trace-section">
          <div className="match-trace-section-title">Available routes</div>
          <ul className="match-trace-list">
            {trace.availableRoutes.map((route) => (
              <li key={route} title={route}>{route}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {trace?.candidates?.length ? (
        <div className="match-trace-section">
          <div className="match-trace-section-title">Responses considered</div>
          {trace.candidates.map((candidate) => {
            const candidateKey = candidate.responseUid || candidate.responseName;

            return (
              <div
                key={candidateKey}
                className={`match-trace-candidate ${candidate.selected ? 'is-selected' : ''}`}
              >
                <div className="match-trace-candidate-header">
                  <span className="match-trace-candidate-name">{candidate.responseName}</span>
                  {candidate.isFallback ? <StatusBadge size="sm">fallback</StatusBadge> : null}
                  {candidate.selected ? <StatusBadge status="success" size="sm">selected</StatusBadge> : null}
                  {candidate.matched && !candidate.selected ? (
                    <StatusBadge status="warning" size="sm">matched, not selected</StatusBadge>
                  ) : null}
                </div>

                {candidate.conditions?.length ? (
                  <ul className="match-trace-conditions">
                    {candidate.conditions.map((condition, index) => {
                      const conditionText = formatCondition(condition);
                      const actualValue = formatConditionValue(condition.actual);

                      return (
                        <li key={`${candidateKey}-${index}`}>
                          <StatusBadge
                            className="match-trace-condition-status"
                            status={condition.pass ? 'success' : 'danger'}
                            size="xs"
                          >
                            {condition.pass ? 'pass' : 'fail'}
                          </StatusBadge>
                          <span className="match-trace-condition-text" title={conditionText}>{conditionText}</span>
                          {!condition.pass ? (
                            <span className="match-trace-actual" title={actualValue}>got {actualValue}</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {!candidate.matched && candidate.ruleOperator && candidate.conditions?.length ? (
                  <div className="match-trace-operator">
                    Rule group: {candidate.ruleOperator}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const LOG_ROW_TESTID_PREFIX = 'mock-server-log-row-';

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

const RequestLog = ({ mockServerUid, location }) => {
  const dispatch = useDispatch();
  const logs = useSelector((state) => state.mockServer.requestLogs[mockServerUid]) || [];
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const [matchFilter, setMatchFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedLogUid, setSelectedLogUid] = useState(null);
  const [collapsedLogUid, setCollapsedLogUid] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeMockServerLog(mockServerUid);
    dispatch(syncMockServerState(location));

    return unsubscribe;
  }, [dispatch, mockServerUid, location.workspacePath]);

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (matchFilter === 'matched' && !entry.matched) return false;
      if (matchFilter === 'unmatched' && entry.matched) return false;

      if (statusFilter && getStatusBucket(entry.statusCode) !== statusFilter) return false;

      return true;
    });
  }, [logs, matchFilter, statusFilter]);

  const displayedLogs = useMemo(() => [...filteredLogs].reverse(), [filteredLogs]);

  const autoExpandUid = displayedLogs[0]?.matchTrace ? displayedLogs[0].uid : null;
  const isSelectionVisible = selectedLogUid && displayedLogs.some((entry) => entry.uid === selectedLogUid);
  const expandedLogUid = isSelectionVisible
    ? selectedLogUid
    : (collapsedLogUid === autoExpandUid ? null : autoExpandUid);

  const handleClear = () => {
    dispatch(clearMockLog({ mockServerUid }));
    setSelectedLogUid(null);
    setCollapsedLogUid(null);
  };

  const toggleTrace = (uid) => {
    const isExpanded = expandedLogUid === uid;
    setSelectedLogUid(isExpanded ? null : uid);
    setCollapsedLogUid(isExpanded ? uid : null);
  };

  const focusedTab = tabs?.find((tab) => tab.uid === activeTabUid);
  const logWidths = focusedTab?.tableColumnWidths?.['mock-server-log'] || {};

  const handleColumnWidthsChange = (widths) => {
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId: 'mock-server-log', widths }));
  };

  const tableRows = useMemo(() => displayedLogs.flatMap((entry) => (
    entry.uid === expandedLogUid
      ? [entry, { uid: `${entry.uid}::trace`, entry, isTraceRow: true }]
      : [entry]
  )), [displayedLogs, expandedLogUid]);

  const rowConfig = useMemo(() => ({
    renderFullWidth: (row) => (row.isTraceRow ? <MatchTracePanel entry={row.entry} /> : null),
    className: (row) => {
      if (row.isTraceRow) return 'log-trace-row';
      return row.uid === expandedLogUid ? 'log-row-expanded' : '';
    },
    testId: (row) => (row.isTraceRow ? undefined : `${LOG_ROW_TESTID_PREFIX}${row.uid}`)
  }), [expandedLogUid]);

  const handleRowClick = (event) => {
    const row = event.target.closest(`tr[data-testid^="${LOG_ROW_TESTID_PREFIX}"]`);
    if (!row) return;

    if (event.detail > 1 || window.getSelection()?.toString()) return;

    toggleTrace(row.dataset.testid.slice(LOG_ROW_TESTID_PREFIX.length));
  };

  const columns = [
    {
      key: 'timestamp',
      name: 'Time',
      width: '13%',
      render: ({ value }) => {
        const label = formatTimestamp(value);

        return <span className="log-timestamp truncate-cell" title={label}>{label}</span>;
      }
    },
    {
      key: 'method',
      name: 'Method',
      width: '9%',
      render: ({ value }) => <MethodBadge method={value} className="method-badge" />
    },
    {
      key: 'path',
      name: 'Path',
      render: ({ value }) => <span className="log-path truncate-cell" title={value}>{value}</span>
    },
    {
      key: 'mockResponse',
      name: 'Mock Response',
      width: '18%',
      getValue: getMatchedMockResponseName,
      render: ({ value, row }) => (
        row.matched
          ? <span className="truncate-cell" title={value || undefined}>{value || '-'}</span>
          : <span className="no-match-label">No Match</span>
      )
    },
    {
      key: 'statusCode',
      name: 'Status',
      width: '8%',
      render: ({ value, row }) => (
        <span className={`status-code truncate-cell ${getStatusClass(value, row.matched)}`} title={String(value)}>{value}</span>
      )
    },
    {
      key: 'delay',
      name: 'Delay',
      width: '8%',
      render: ({ value }) => {
        const label = value > 0 ? `${value}ms` : '-';

        return <span className="truncate-cell" title={label}>{label}</span>;
      }
    },
    {
      key: 'duration',
      name: 'Duration',
      width: '9%',
      render: ({ value }) => <span className="truncate-cell" title={`${value}ms`}>{value}ms</span>
    }
  ];

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
        <Button
          variant="ghost"
          color="secondary"
          size="xs"
          icon={<IconTrash size={14} stroke={1.5} />}
          onClick={handleClear}
          data-testid="mock-server-log-clear"
        >
          Clear
        </Button>
      </div>

      <div onClick={handleRowClick}>
        <EditableTable
          tableId="mock-server-log"
          columns={columns}
          rows={tableRows}
          onChange={() => {}}
          rowConfig={rowConfig}
          showCheckbox={false}
          showDelete={false}
          showAddRow={false}
          columnWidths={logWidths}
          onColumnWidthsChange={handleColumnWidthsChange}
          testId="mock-server-log-table"
        />
      </div>
    </StyledWrapper>
  );
};

export default RequestLog;
