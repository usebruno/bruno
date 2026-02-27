import React, { useMemo } from 'react';
import get from 'lodash/get';

const VisualDiffParams = ({ oldData, newData, showSide }) => {
  const oldParams = get(oldData, 'request.params', []);
  const newParams = get(newData, 'request.params', []);

  const currentParams = showSide === 'old' ? oldParams : newParams;
  const otherParams = showSide === 'old' ? newParams : oldParams;

  const paramsWithStatus = useMemo(() => {
    // Two-pass matching to handle duplicate param names correctly
    const available = otherParams.map((p) => ({ ...p, _matched: false }));
    const results = currentParams.map((param) => ({ ...param, status: 'pending' }));

    // Pass 1: Exact matches (same name + value + enabled)
    results.forEach((param) => {
      if (param.status !== 'pending') return;
      const match = available.find(
        (p) => !p._matched && p.name === param.name && p.value === param.value && p.enabled === param.enabled
      );
      if (match) {
        match._matched = true;
        param.status = 'unchanged';
      }
    });

    // Pass 2: Name-only matches for remaining (modified)
    results.forEach((param) => {
      if (param.status !== 'pending') return;
      const match = available.find((p) => !p._matched && p.name === param.name);
      if (match) {
        match._matched = true;
        param.status = 'modified';
      }
    });

    // Pass 3: No match at all (added/deleted)
    results.forEach((param) => {
      if (param.status === 'pending') {
        param.status = showSide === 'old' ? 'deleted' : 'added';
      }
    });

    return results;
  }, [currentParams, otherParams, showSide]);

  // Only show params that have changes (added, deleted, or modified)
  const changedParams = paramsWithStatus.filter((p) => p.status !== 'unchanged');
  const queryParams = changedParams.filter((p) => p.type === 'query');
  const pathParams = changedParams.filter((p) => p.type === 'path');

  if (queryParams.length === 0 && pathParams.length === 0) {
    if (currentParams.length > 0) {
      return <div className="empty-placeholder" />;
    }
    return null;
  }

  const renderTable = (params, title) => {
    if (params.length === 0) return null;

    return (
      <div className="diff-section">
        <div className="diff-section-header">{title}</div>
        <table className="diff-table">
          <thead>
            <tr>
              <th style={{ width: '30px' }}></th>
              <th className="checkbox-cell"></th>
              <th style={{ width: '40%' }}>Key</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {params.map((param, index) => (
              <tr key={`${param.name}-${index}`} className={param.status}>
                <td>
                  {param.status !== 'unchanged' && (
                    <span className={`status-badge ${param.status}`}>
                      {param.status === 'added' ? 'A' : param.status === 'deleted' ? 'D' : 'M'}
                    </span>
                  )}
                </td>
                <td className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={param.enabled !== false}
                    readOnly
                    disabled
                  />
                </td>
                <td className="key-cell">{param.name}</td>
                <td className="value-cell">{param.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      {renderTable(queryParams, 'Query Parameters')}
      {renderTable(pathParams, 'Path Parameters')}
    </>
  );
};

export default VisualDiffParams;
