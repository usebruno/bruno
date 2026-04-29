import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearMockLog } from 'providers/ReduxStore/slices/mock-server';
import EditableTable from 'components/EditableTable';
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

const RequestLog = ({ collection }) => {
  const dispatch = useDispatch();
  const logs = useSelector((state) => state.mockServer.requestLogs[collection.uid]) || [];
  const [matchFilter, setMatchFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const tableContainerRef = useRef(null);

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

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
    }
  }, [filteredLogs.length]);

  const handleClear = () => {
    dispatch(clearMockLog({ collectionUid: collection.uid }));
  };

  const columns = [
    {
      key: 'timestamp',
      name: 'Time',
      width: '110px',
      render: ({ value }) => (
        <span className="log-timestamp">{formatTimestamp(value)}</span>
      )
    },
    {
      key: 'method',
      name: 'Method',
      width: '80px',
      render: ({ value }) => (
        <span className={`method-badge ${(value || '').toLowerCase()}`}>{value}</span>
      )
    },
    {
      key: 'path',
      name: 'Path',
      render: ({ value }) => (
        <span className="log-path">{value}</span>
      )
    },
    {
      key: 'matchedExampleName',
      name: 'Example',
      width: '140px',
      render: ({ row }) => (
        row.matched
          ? <span>{row.matchedExampleName}</span>
          : <span className="no-match-label">No Match</span>
      )
    },
    {
      key: 'statusCode',
      name: 'Status',
      width: '70px',
      render: ({ row }) => (
        <span className={`status-code ${getStatusClass(row.statusCode, row.matched)}`}>
          {row.statusCode}
        </span>
      )
    },
    {
      key: 'delay',
      name: 'Delay',
      width: '70px',
      render: ({ value }) => <span>{value > 0 ? `${value}ms` : '-'}</span>
    },
    {
      key: 'duration',
      name: 'Duration',
      width: '80px',
      render: ({ value }) => <span>{value}ms</span>
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
        <button className="text-link select-none" onClick={handleClear} data-testid="mock-server-log-clear">
          Clear
        </button>
      </div>

      <div className="log-table-container" ref={tableContainerRef}>
        <EditableTable
          columns={columns}
          rows={filteredLogs}
          onChange={() => {}}
          showCheckbox={false}
          showDelete={false}
          showAddRow={false}
        />
      </div>
    </StyledWrapper>
  );
};

export default RequestLog;
