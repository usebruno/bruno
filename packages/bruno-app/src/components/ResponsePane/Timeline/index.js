import React from 'react';
import forOwn from 'lodash/forOwn';
import { safeStringifyJSON } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const Timeline = ({ request, response }) => {
  const requestHeaders = [];
  const responseHeaders = typeof response.headers === 'object' ? Object.entries(response.headers) : [];

  request = request || {};
  response = response || {};

  forOwn(request.headers, (value, key) => {
    requestHeaders.push({
      name: key,
      value
    });
  });

  let requestData = typeof request?.data === "string" ? request?.data : safeStringifyJSON(request?.data, true);

  return (
    <StyledWrapper className="pb-4 w-full">
      <div>
        <pre className="line request font-bold">
          <span className="arrow">{'>'}</span> {request.method} {request.url}
        </pre>
        {requestHeaders.map((h) => {
          return (
            <pre className="line request" key={h.name}>
              <span className="arrow">{'>'}</span> {h.name}: {h.value}
            </pre>
          );
        })}

        {requestData ? (
          <pre className="line request">
            <span className="arrow">{'>'}</span> data{' '}
            <pre className="text-sm flex flex-wrap whitespace-break-spaces">{requestData}</pre>
          </pre>
        ) : null}
      </div>

      <div className="mt-4">
        <pre className="line response font-bold">
          <span className="arrow">{'<'}</span> {response.status} - {response.statusText}
        </pre>

        {responseHeaders.map((h) => {
          return (
            <pre className="line response" key={h[0]}>
              <span className="arrow">{'<'}</span> {h[0]}: {h[1]}
            </pre>
          );
        })}
      </div>
    </StyledWrapper>
  );
};

export default Timeline;
