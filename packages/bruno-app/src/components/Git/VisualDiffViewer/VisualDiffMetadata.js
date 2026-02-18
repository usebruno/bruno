import React, { useMemo } from 'react';
import get from 'lodash/get';

const VisualDiffMetadata = ({ oldData, newData, showSide }) => {
  const oldMetadata = get(oldData, 'metadata', []);
  const newMetadata = get(newData, 'metadata', []);

  const currentMetadata = showSide === 'old' ? oldMetadata : newMetadata;
  const otherMetadata = showSide === 'old' ? newMetadata : oldMetadata;

  const metadataWithStatus = useMemo(() => {
    const otherMap = new Map();
    otherMetadata.forEach((m) => {
      otherMap.set(m.name, m);
    });

    return currentMetadata.map((item) => {
      const otherItem = otherMap.get(item.name);

      let status = 'unchanged';
      if (!otherItem) {
        status = showSide === 'old' ? 'deleted' : 'added';
      } else if (item.value !== otherItem.value || item.enabled !== otherItem.enabled) {
        status = 'modified';
      }

      return { ...item, status };
    });
  }, [currentMetadata, otherMetadata, showSide]);

  if (metadataWithStatus.length === 0) {
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
          {metadataWithStatus.map((item, index) => (
            <tr key={`${item.name}-${index}`} className={item.status}>
              <td>
                {item.status !== 'unchanged' && (
                  <span className={`status-badge ${item.status}`}>
                    {item.status === 'added' ? 'A' : item.status === 'deleted' ? 'D' : 'M'}
                  </span>
                )}
              </td>
              <td className="checkbox-cell">
                <input type="checkbox" checked={item.enabled !== false} readOnly disabled />
              </td>
              <td className="key-cell">{item.name}</td>
              <td className="value-cell">{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VisualDiffMetadata;
