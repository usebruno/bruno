import React from 'react';
import StyledWrapper from './StyledWrapper';

const WSResponseHeaders = ({ response }) => {
  const formatHeaders = (headers) => {
    if (!headers) return [];
    if (Array.isArray(headers)) return headers;
    return Object.entries(headers).map(([key, value]) => ({ name: key, value }));
  };

  const metadataArray = formatHeaders(response.headers);

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

export default WSResponseHeaders;
