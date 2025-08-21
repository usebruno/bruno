import React from 'react';
import StyledWrapper from './StyledWrapper';

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
