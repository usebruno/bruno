import React, { useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import { isValidUrl } from 'utils/url';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';

const ResponseHeaders = ({ headers, item }) => {
  const headersArray = typeof headers === 'object' ? Object.entries(headers) : [];
  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `response-headers-scroll-${item?.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.response-tab-content', onChange: setScroll, initialValue: scroll });

  const renderValue = (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();

    // Only allow http(s) links from response headers.
    if (/^https?:\/\//i.test(trimmed) && isValidUrl(trimmed)) {
      return (
        <a
          href={trimmed}
          onClick={(e) => {
            const openExternal = window?.ipcRenderer?.openExternal;
            if (typeof openExternal === 'function') {
              e.preventDefault();
              openExternal(trimmed);
            }
          }}
        >
          {value}
        </a>
      );
    }

    return value;
  };

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
                      <td className="value">{renderValue(header[1])}</td>
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
