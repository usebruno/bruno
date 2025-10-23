import React from 'react';
import StyledWrapper from './StyledWrapper';

const ResponseTrailers = ({ trailers }) => {
  const trailersArray = Array.isArray(trailers) ? trailers : [];

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
          {trailersArray && trailersArray.length ? (
            trailersArray.map((trailer, index) => (
              <tr key={index}>
                <td className="key">{trailer.name}</td>
                <td className="value">{trailer.value}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2" className="text-center py-4 text-gray-500">
                No trailers received
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </StyledWrapper>
  );
};

export default ResponseTrailers;
