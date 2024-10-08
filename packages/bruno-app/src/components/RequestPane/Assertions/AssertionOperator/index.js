import React from 'react';
import { operators, getOperatorLabel } from 'utils/testing/assertions/index';

const AssertionOperator = ({ operator, onChange }) => {
  const handleChange = (e) => onChange(e.target.value);

  return (
    <select value={operator} onChange={handleChange} className="mousetrap">
      {operators.map((operator) => (
        <option key={operator} value={operator}>
          {getOperatorLabel(operator)}
        </option>
      ))}
    </select>
  );
};

export default AssertionOperator;
