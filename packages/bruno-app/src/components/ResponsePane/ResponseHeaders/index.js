import React, { useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import { usePersistedContainerScroll } from 'hooks/usePersistedState/usePersistedContainerScroll';

const ResponseHeaders = ({ headers, item }) => {
  const headersArray = typeof headers === 'object' ? Object.entries(headers) : [];
  const wrapperRef = useRef(null);
  usePersistedContainerScroll(wrapperRef, '.response-tab-content', `response-headers-scroll-${item?.uid}`);

  return (
    <StyledWrapper className="w-full" ref={wrapperRef}>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <td>Name</td>
              <td>Value</td>
            </tr>
          </thead>
          <tbody>
            {headersArray && headersArray.length
              ? headersArray.map((header, index) => {
                  return (
                    <tr key={index}>
                      <td className="key">{header[0]}</td>
                      <td className="value">{header[1]}</td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
    </StyledWrapper>
  );
};
export default ResponseHeaders;
