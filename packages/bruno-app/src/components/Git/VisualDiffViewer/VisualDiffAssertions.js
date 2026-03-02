import React, { useMemo } from 'react';
import get from 'lodash/get';

const VisualDiffAssertions = ({ oldData, newData, showSide }) => {
  const oldAssertions = get(oldData, 'request.assertions', []) || [];
  const newAssertions = get(newData, 'request.assertions', []) || [];

  const currentAssertions = showSide === 'old' ? oldAssertions : newAssertions;
  const otherAssertions = showSide === 'old' ? newAssertions : oldAssertions;

  const otherAssertionMap = useMemo(() => {
    const map = new Map();
    otherAssertions.forEach((assertion) => {
      map.set(assertion.name, assertion);
    });
    return map;
  }, [otherAssertions]);

  const assertionsWithStatus = useMemo(() => {
    return currentAssertions.map((assertion) => {
      const otherAssertion = otherAssertionMap.get(assertion.name);
      let status = 'unchanged';

      if (!otherAssertion) {
        status = showSide === 'old' ? 'deleted' : 'added';
      } else if (assertion.value !== otherAssertion.value || assertion.enabled !== otherAssertion.enabled) {
        status = 'modified';
      }

      return { ...assertion, status };
    });
  }, [currentAssertions, otherAssertionMap, showSide]);

  if (assertionsWithStatus.length === 0) {
    return null;
  }

  return (
    <div className="diff-section">
      <table className="diff-table">
        <thead>
          <tr>
            <th style={{ width: '30px' }}></th>
            <th className="checkbox-cell"></th>
            <th style={{ width: '40%' }}>Expression</th>
            <th>Expected</th>
          </tr>
        </thead>
        <tbody>
          {assertionsWithStatus.map((assertion, index) => (
            <tr key={`${assertion.name}-${index}`} className={assertion.status}>
              <td>
                {assertion.status !== 'unchanged' && (
                  <span className={`status-badge ${assertion.status}`}>
                    {assertion.status === 'added' ? 'A' : assertion.status === 'deleted' ? 'D' : 'M'}
                  </span>
                )}
              </td>
              <td className="checkbox-cell">
                <input
                  type="checkbox"
                  checked={assertion.enabled !== false}
                  readOnly
                  disabled
                />
              </td>
              <td className="key-cell">{assertion.name}</td>
              <td className="value-cell">{assertion.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VisualDiffAssertions;
