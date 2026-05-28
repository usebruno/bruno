import React, { useMemo } from 'react';
import get from 'lodash/get';

const VisualDiffHeaders = ({ oldData, newData, showSide }) => {
  const oldHeaders = get(oldData, 'request.headers', []);
  const newHeaders = get(newData, 'request.headers', []);

  const currentHeaders = showSide === 'old' ? oldHeaders : newHeaders;
  const otherHeaders = showSide === 'old' ? newHeaders : oldHeaders;

  const headersWithStatus = useMemo(() => {
    const otherHeaderMap = new Map();
    otherHeaders.forEach((h) => {
      otherHeaderMap.set(h.name, h);
    });

    return currentHeaders.map((header) => {
      const otherHeader = otherHeaderMap.get(header.name);

      let status = 'unchanged';
      if (!otherHeader) {
        status = showSide === 'old' ? 'deleted' : 'added';
      } else if (header.value !== otherHeader.value || header.enabled !== otherHeader.enabled) {
        status = 'modified';
      }

      return { ...header, status };
    });
  }, [currentHeaders, otherHeaders, showSide]);

  if (headersWithStatus.length === 0) {
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
          {headersWithStatus.map((header, index) => (
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
