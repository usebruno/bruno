import React, { useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';

const flattenHeaders = (headers) => {
  if (typeof headers !== 'object' || headers === null) return [];
  // Multi-valued headers (e.g. Set-Cookie) arrive as arrays from the network layer.
  // Render each value as its own row so they don't collapse into an unreadable blob.
  return Object.entries(headers).flatMap(([name, value]) =>
    Array.isArray(value) ? value.map((v) => [name, v]) : [[name, value]]
  );
};

const ResponseHeaders = ({ headers, item }) => {
  const headersArray = flattenHeaders(headers);
  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `response-headers-scroll-${item?.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.response-tab-content', onChange: setScroll, initialValue: scroll });

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
