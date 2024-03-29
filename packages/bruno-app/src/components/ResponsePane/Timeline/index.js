import React from 'react';
import forOwn from 'lodash/forOwn';
import { safeStringifyJSON } from 'utils/common';
import StyledWrapper from './StyledWrapper';
import { useSelector } from 'react-redux';

const Timeline = ({ request, response }) => {
  const preferences = useSelector((state) => state.app.preferences);
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

  let requestData = safeStringifyJSON(request.data);
  let responseData = undefined;
  if (
    preferences.response.showInTimeline &&
    (preferences.response.sizeLimit == 0 || response.size / 1024 <= preferences.response.sizeLimit)
  ) {
    let contentType = (response.headers['content-type'] || '').split(';')[0];
    if (
      preferences.response.mimeTypes === undefined ||
      preferences.response.mimeTypes === '' ||
      preferences.response.mimeTypes === '*' ||
      preferences.response.mimeTypes.includes(contentType)
    ) {
      responseData = response.data;
      if (typeof responseData === 'object') {
        responseData = safeStringifyJSON(response.data, true);
      }
    }
  }

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
            <span className="arrow">{'>'}</span> data {requestData}
          </pre>
        ) : null}
      </div>

      <div className="mt-4">
        <pre className="line response font-bold">
          <span className="arrow">{'<'}</span> {response.status} {response.statusText}
        </pre>

        {responseHeaders.map((h) => {
          return (
            <pre className="line response" key={h[0]}>
              <span className="arrow">{'<'}</span> {h[0]}: {h[1]}
            </pre>
          );
        })}
      </div>

      {response.error ? (
        <div className="mt-4">
          <pre className="line error text-red-500 font-bold">{response.error}</pre>
        </div>
      ) : null}

      {responseData ? (
        <div className="mt-4">
          <pre className="line response font-bold">
            <span className="arrow">{'<'}</span> DATA
          </pre>

          <pre className="line response">{responseData}</pre>
        </div>
      ) : null}
    </StyledWrapper>
  );
};

export default Timeline;
