import React from 'react';
import StyledWrapper from './StyledWrapper';

const VariablesTable = ({ variables }) => {
  return (
    <StyledWrapper>
      <table className="w-full">
        <tbody>
          {variables.map((variable) => (
            <tr key={variable.uid}>
              <td className='variable-name text-yellow-600'>{variable.name}</td>
              <td className='pl-2'>{variable.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </StyledWrapper>
  );
};

export default VariablesTable;
