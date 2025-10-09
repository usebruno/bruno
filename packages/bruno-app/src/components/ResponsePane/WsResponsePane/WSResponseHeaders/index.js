import React from 'react';
import StyledWrapper from './StyledWrapper';

const WSResponseHeaders = ({ response }) => {
  const formatHeaders = (headers) => {
    if (!headers) return [];
    if (Array.isArray(headers)) return headers;
    return Object.entries(headers).map(([key, value]) => ({ name: key, value }));
  };

  const headersArray = formatHeaders(response.headers);

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
          {headersArray && headersArray.length ? (
            headersArray.map((header, index) => (
              <tr key={index}>
                <td className="key">{header.name}</td>
                <td className="value">{header.value}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2" className="text-center py-4 text-gray-500">
                No headers received
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </StyledWrapper>
  );
};

export default WSResponseHeaders;
