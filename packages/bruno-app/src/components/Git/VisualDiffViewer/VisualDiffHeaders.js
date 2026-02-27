import React, { useMemo } from 'react';
import get from 'lodash/get';

const VisualDiffHeaders = ({ oldData, newData, showSide }) => {
  const oldHeaders = get(oldData, 'request.headers', []);
  const newHeaders = get(newData, 'request.headers', []);

  const currentHeaders = showSide === 'old' ? oldHeaders : newHeaders;
  const otherHeaders = showSide === 'old' ? newHeaders : oldHeaders;

  const headersWithStatus = useMemo(() => {
    const available = otherHeaders.map((h) => ({ ...h, _matched: false }));
    const results = currentHeaders.map((header) => ({ ...header, status: 'pending' }));

    // Pass 1: Exact matches (same name + value + enabled)
    results.forEach((header) => {
      if (header.status !== 'pending') return;
      const match = available.find(
        (h) => !h._matched && h.name === header.name && h.value === header.value && h.enabled === header.enabled
      );
      if (match) {
        match._matched = true;
        header.status = 'unchanged';
      }
    });

    // Pass 2: Name-only matches (modified)
    results.forEach((header) => {
      if (header.status !== 'pending') return;
      const match = available.find((h) => !h._matched && h.name === header.name);
      if (match) {
        match._matched = true;
        header.status = 'modified';
      }
    });

    // Pass 3: No match (added/deleted)
    results.forEach((header) => {
      if (header.status === 'pending') {
        header.status = showSide === 'old' ? 'deleted' : 'added';
      }
    });

    return results;
  }, [currentHeaders, otherHeaders, showSide]);

  // Only show headers that have changes (added, deleted, or modified)
  const changedHeaders = headersWithStatus.filter((h) => h.status !== 'unchanged');

  if (changedHeaders.length === 0) {
    if (currentHeaders.length > 0) {
      return <div className="empty-placeholder" />;
    }
    return null;
  }

  return (
    <div className="diff-section">
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
          {changedHeaders.map((header, index) => (
            <tr key={`${header.name}-${index}`} className={header.status}>
              <td>
                {header.status !== 'unchanged' && (
                  <span className={`status-badge ${header.status}`}>
                    {header.status === 'added' ? 'A' : header.status === 'deleted' ? 'D' : 'M'}
                  </span>
                )}
              </td>
              <td className="checkbox-cell">
                <input
                  type="checkbox"
                  checked={header.enabled !== false}
                  readOnly
                  disabled
                />
              </td>
              <td className="key-cell">{header.name}</td>
              <td className="value-cell">{header.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VisualDiffHeaders;
