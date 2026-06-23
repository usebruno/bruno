import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { IconCopy, IconCheck } from '@tabler/icons';
import toast from 'react-hot-toast';
import EditableTable from 'components/EditableTable';
import FilterDropdown from 'components/FilterDropdown';
import StyledWrapper from './StyledWrapper';

const RouteTable = ({ mockServerUid }) => {
  const routes = useSelector((state) => state.mockServer.routes[mockServerUid]) || [];
  const requestLogs = useSelector((state) => state.mockServer.requestLogs[mockServerUid]) || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState(null);
  const [copiedRouteUid, setCopiedRouteUid] = useState(null);

  const serverState = useSelector((state) => state.mockServer.servers[mockServerUid]) || {};
  const isRunning = serverState.status === 'running';
  const baseUrl = isRunning ? serverState.baseUrl : null;

  const hitCounts = useMemo(() => {
    const counts = {};
    for (const entry of requestLogs) {
      if (entry.matched) {
        const key = `${entry.method} ${entry.path}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return counts;
  }, [requestLogs]);

  const filteredRoutes = useMemo(() => {
    return routes
      .filter((route) => {
        if (methodFilter && route.method !== methodFilter) return false;
        if (searchQuery && !route.path.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .map((route) => ({
        ...route,
        uid: `${route.method} ${route.path}`,
        hits: hitCounts[`${route.method} ${route.path}`] || 0,
        responseCount: route.responseCount ?? route.exampleCount ?? 0,
        defaultResponse: route.defaultResponse ?? route.defaultExample ?? null,
        source: route.responses?.[0]?.sourceFile || route.examples?.[0]?.sourceFile || '-'
      }));
  }, [routes, searchQuery, methodFilter, hitCounts]);

  const methodOptions = useMemo(() => {
    const unique = new Set(routes.map((r) => r.method));
    return Array.from(unique).sort().map((m) => ({ value: m, label: m }));
  }, [routes]);

  const handleCopyRouteUrl = async (routeUid, path) => {
    if (!baseUrl) return;

    const routePath = path.startsWith('/') ? path : `/${path}`;

    try {
      await navigator.clipboard.writeText(`${baseUrl}${routePath}`);
      setCopiedRouteUid(routeUid);
      setTimeout(() => setCopiedRouteUid(null), 1500);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const columns = [
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
      render: ({ value, row }) => (
        <div className="path-cell">
          <span className="route-path">{value}</span>
          {baseUrl && (
            <button
              type="button"
              className="copy-path-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyRouteUrl(row.uid, value);
              }}
              title="Copy route URL"
            >
              {copiedRouteUid === row.uid
                ? <IconCheck size={13} strokeWidth={2} />
                : <IconCopy size={13} strokeWidth={1.5} />}
            </button>
          )}
        </div>
      )
    },
    {
      key: 'responseCount',
      name: 'Responses',
      width: '90px',
      render: ({ row }) => <span>{row.responseCount}</span>
    },
    {
      key: 'defaultResponse',
      name: 'Default',
      width: '140px',
      render: ({ row }) => <span>{row.defaultResponse || '-'}</span>
    },
    {
      key: 'source',
      name: 'Source',
      width: '120px',
      render: ({ value }) => <span className="text-muted source-file" title={value}>{value}</span>
    },
    {
      key: 'hits',
      name: 'Hits',
      width: '60px',
      render: ({ value }) => <span>{value}</span>
    }
  ];

  if (routes.length === 0) {
    return (
      <StyledWrapper className="h-full w-full">
        <div className="text-xs text-muted empty-state">
          No routes registered yet. Create mock responses to define routes for this server.
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="h-full w-full">
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          className="search-input"
          placeholder="Search routes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="mock-server-route-search"
        />
        <FilterDropdown
          label="Method"
          options={methodOptions}
          value={methodFilter}
          onChange={setMethodFilter}
          allLabel="All Methods"
          placement="right"
          testId="mock-server-method-filter"
        />
      </div>

      <EditableTable
        columns={columns}
        rows={filteredRoutes}
        onChange={() => {}}
        showCheckbox={false}
        showDelete={false}
        showAddRow={false}
      />

      {filteredRoutes.length === 0 && routes.length > 0 && (
        <div className="text-xs text-muted mt-4 empty-state">No routes match your filter.</div>
      )}
    </StyledWrapper>
  );
};

export default RouteTable;
