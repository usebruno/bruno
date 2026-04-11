import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import EditableTable from 'components/EditableTable';
import FilterDropdown from 'components/FilterDropdown';
import StyledWrapper from './StyledWrapper';

const RouteTable = ({ collection }) => {
  const routes = useSelector((state) => state.mockServer.routes[collection.uid]) || [];
  const requestLogs = useSelector((state) => state.mockServer.requestLogs[collection.uid]) || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState(null);

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
      .map((route, idx) => ({
        ...route,
        uid: `route-${idx}`,
        hits: hitCounts[`${route.method} ${route.path}`] || 0,
        source: route.examples?.[0]?.sourceFile || '-'
      }));
  }, [routes, searchQuery, methodFilter, hitCounts]);

  const methodOptions = useMemo(() => {
    const unique = new Set(routes.map((r) => r.method));
    return Array.from(unique).sort().map((m) => ({ value: m, label: m }));
  }, [routes]);

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
      render: ({ value }) => (
        <span className="route-path">{value}</span>
      )
    },
    {
      key: 'exampleCount',
      name: 'Examples',
      width: '80px',
      render: ({ value }) => <span>{value}</span>
    },
    {
      key: 'defaultExample',
      name: 'Default',
      width: '120px',
      render: ({ value }) => <span>{value || '-'}</span>
    },
    {
      key: 'source',
      name: 'Source',
      width: '180px',
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
          No routes registered. Start the mock server to scan your collection for examples.
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
