import React from 'react';
import styled from 'styled-components';

const StyledWrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;

    thead {
      color: #777777;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    td {
      padding: 6px 10px;

      &.value {
        word-break: break-all;
      }
    }

    tbody {
      tr:nth-child(odd) {
        background-color: ${(props) => props.theme.table.striped};
      }
    }
  }
`;

const GrpcResponseHeaders = ({ metadata }) => {
  // Ensure headers is an array
  const metadataArray = Array.isArray(metadata) ? metadata : [];

  return (
    <StyledWrapper className="pb-4 w-full">
      <table>
        <thead>
          <tr>
            <td>Name</td>
            <td>Value</td>
          </tr>
        </thead>
        <tbody>
          {metadataArray && metadataArray.length ? (
            metadataArray.map((metadata, index) => (
              <tr key={index}>
                <td className="key">{metadata.name}</td>
                <td className="value">{metadata.value}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2" className="text-center py-4 text-gray-500">
                No metadata received
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </StyledWrapper>
  );
};

export default GrpcResponseHeaders; 