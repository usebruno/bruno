import React from 'react';
import forOwn from 'lodash/forOwn';
import { safeStringifyJSON } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const Timeline = ({ request, response }) => {
  const requestHeaders = [];
  const responseHeaders = typeof response.headers === 'object' ? Object.entries(response.headers) : [];
  const requestData = typeof request?.data === "string" ? request?.data : safeStringifyJSON(request?.data, true);

  const authRequest = request.authRequest;
  const authResponse = request.authResponse;
  const authRequestHeaders = typeof authRequest?.headers === 'object' ? Object.entries(authRequest.headers) : [];
  const authResponseHeaders = typeof authResponse?.headers === 'object' ? Object.entries(authResponse?.headers) : [];
  const authRequestData = authRequest?.data === "string" ? authRequest?.data : safeStringifyJSON(authRequest?.data, true);

  request = request || {};
  response = response || {};

  forOwn(request.headers, (value, key) => {
    requestHeaders.push({
      name: key,
      value
    });
  });

  return (
    <StyledWrapper className="pb-4 w-full">
      {authRequest ? (
        <>
          <div>
            <pre className="line request font-bold">
              <span className="arrow">{'>'}</span> {authRequest.method} {authRequest.url}
            </pre>
            {authRequestHeaders.map((h) => {
              return (
                <pre className="line request" key={h[0]}>
                  <span className="arrow">{'>'}</span> {h[0]}: {h[1]}
                </pre>
              );
            })}
            {authRequestData ? (
              <pre className="line request">
                <span className="arrow">{'>'}</span> data {authRequestData}
              </pre>
            ) : null}
          </div>
          {authResponse ? (
            <div className="mt-4">
              <pre className="line response font-bold">
                <span className="arrow">{'<'}</span> {authResponse.status} {authResponse.statusText}
              </pre>
              {authResponseHeaders.map((h) => {
                return (
                  <pre className="line response" key={h[0]}>
                    <span className="arrow">{'<'}</span> {h[0]}: {h[1]}
                  </pre>
                );
              })}
            </div>
          ) : null}
          <div className="mt-4" />
        </>
      ) : null}

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
