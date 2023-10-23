import React from 'react';
import StyledWrapper from './StyledWrapper';
import PaneContent from 'components/RequestPane/PaneContent/index';

const ResponseHeaders = ({ headers }) => {
  return (
    <PaneContent>
      <StyledWrapper className="pb-4 w-full">
        <thead>
          <tr>
            <td>Name</td>
            <td>Value</td>
          </tr>
        </thead>
        <tbody>
          {headers && headers.length
            ? headers.map((header, index) => {
                return (
                  <tr key={index}>
                    <td className="key">{header[0]}</td>
                    <td className="value">{header[1]}</td>
                  </tr>
                );
              })
            : null}
        </tbody>
      </StyledWrapper>
    </PaneContent>
  );
};
export default ResponseHeaders;
