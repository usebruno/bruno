import React, { useState } from 'react';
import StyledWrapper from './StyledWrapper';
import QueryResult from '../QueryResult/index';
import { findItemInCollection, findParentItemInCollection } from 'utils/collections/index';
import { get } from 'lodash';
const iconv = require('iconv-lite');

const methodColors = {
  GET: 'text-green-500',
  POST: 'text-blue-500',
  PUT: 'text-yellow-500',
  DELETE: 'text-red-500',
  PATCH: 'text-purple-500',
  OPTIONS: 'text-gray-500',
  HEAD: 'text-gray-500',
};

const statusColor = (statusCode) => {
  if (statusCode >= 200 && statusCode < 300) {
    return 'text-green-500';
  } else if (statusCode >= 300 && statusCode < 400) {
    return 'text-yellow-500';
  } else if (statusCode >= 400 && statusCode < 600) {
    return 'text-red-500';
  } else {
    return 'text-gray-500';
  }
};

const getEffectiveAuthSource = (collection, item) => {
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');
  if (authMode !== 'inherit') return null;

  const collectionAuth = get(collection, 'root.request.auth');
  let effectiveSource = {
    type: 'collection',
    uid: collection.uid,
    auth: collectionAuth
  };

  // Get path from collection to item
  let path = [];
  let currentItem = findItemInCollection(collection, item?.uid);
  while (currentItem) {
    path.unshift(currentItem);
    currentItem = findParentItemInCollection(collection, currentItem?.uid);
  }

  // Check folders in reverse to find the closest auth configuration
  for (let i of [...path].reverse()) {
    if (i.type === 'folder') {
      const folderAuth = get(i, 'root.request.auth');
      if (folderAuth && folderAuth.mode && folderAuth.mode !== 'none' && folderAuth.mode !== 'inherit') {
        effectiveSource = {
          type: 'folder',
          uid: i.uid,
          auth: folderAuth
        };
        break;
      }
    }
  }

  return effectiveSource;
};

const Timeline = ({ collection, item, width }) => {
  // Get the effective auth source if auth mode is inherit
  const authSource = getEffectiveAuthSource(collection, item);

  // Filter timeline entries based on new rules
  const combinedTimeline = ([...(collection.timeline || [])]).filter(obj => {
    // Always show entries for this item
    if (obj.itemUid === item.uid) return true;

    // For OAuth2 entries, also show if auth is inherited
    if (obj.type === 'oauth2' && authSource) {
      if (authSource.type === 'folder' && obj.folderUid === authSource.uid) return true;
      if (authSource.type === 'collection' && !obj.folderUid) return true;
    }

    return false;
  }).sort((a, b) => b.timestamp - a.timestamp);

  const [openSections, setOpenSections] = useState(() =>
    combinedTimeline.map((_, index) => index === 0)
  );

  return (
    <StyledWrapper
      className="pb-4 w-full"
      style={{ maxWidth: width - 40, overflowWrap: 'break-word' }}
    >
      {combinedTimeline.map((event, index) => {
        const isOpen = openSections[index];
        const toggleOpen = () => {
          setOpenSections((prevState) => {
            const newState = [...prevState];
            newState[index] = !newState[index];
            return newState;
          });
        };

        if (event.type === 'request') {
          const { request, response, timestamp } = event.data;
          return (
            <div key={index} className="timeline-event border-b border-gray-700 py-2">
              <div
                className="timeline-event-header cursor-pointer"
                onClick={toggleOpen}
              >
                <div className="flex justify-between items-center min-w-0 gap-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className="flex items-center flex-shrink-0">
                      <span
                        className={`${
                          methodColors[request.method?.toUpperCase()] || 'text-white'
                        } font-bold`}
                      >
                        {request.method?.toUpperCase()}
                      </span>{' '}
                    </div>
                    <span
                        className={`${
                          statusColor(response.status || request.statusCode) || 'text-white'
                        } font-bold`}
                      >
                        {response.status || request.statusCode}{' '}
                        {response.statusText || ''}
                      </span>
                    <div className="flex items-center flex-shrink-0 space-x-2">
                      {response.duration && (
                        <span className="text-sm text-gray-400">
                          {response.duration}ms
                        </span>
                      )}
                      {response.size && (
                        <span className="text-sm text-gray-400">
                          {response.size}B
                        </span>
                      )}
                      {response.state && (
                        <span className="text-sm text-gray-400">
                          {response.state}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-400 flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap" style={{ minWidth: '120px', maxWidth: '200px' }}>
                    {new Date(timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="truncate text-sm text-[#9b9b9b] mt-1">{request.url}</div>
              </div>
              {isOpen && (
                <div className="timeline-event-content ml-4 mt-2">
                  <RenderRequestResponse
                    request={request}
                    response={response}
                    item={item}
                    collection={collection}
                    width={width}
                  />
                </div>
              )}
            </div>
          );
        } else if (event.type === 'oauth2') {
          const { data } = event;
          const { debugInfo, fetchedAt } = data;
          const flattenedRequests = flattenRequests(debugInfo);
          return (
            <div key={index} className="timeline-event border-b border-gray-700 py-2">
              <div
                className="timeline-event-header cursor-pointer flex items-center"
                onClick={toggleOpen}
              >
                <div className="flex items-center">
                  <span>{isOpen ? '▼' : '▶'}</span>
                  <span className="ml-2 font-bold">OAuth2.0 Calls</span>
                </div>
              </div>
              {isOpen && (
                <div className="ml-4 mt-2">
                  {flattenedRequests && flattenedRequests.length > 0 ? (
                    flattenedRequests.map((data, idx) => (
                      <OAuthRequestItem
                        key={idx}
                        request={data}
                        item={item}
                        collection={collection}
                        width={width - 50}
                      />
                    ))
                  ) : (
                    <div>No debug information available.</div>
                  )}
                </div>
              )}
            </div>
          );
        }

        return null;
      })}
    </StyledWrapper>
  );
};

const flattenRequests = (requests, level = 0) => {
  let flatList = [];
  requests.forEach((request) => {
    flatList.push({ ...request, isSubRequest: level > 0 });
    if (request.requests && request.requests.length > 0) {
      flatList = flatList.concat(flattenRequests(request.requests, level + 1));
    }
  });
  return flatList;
};

// Helper function to process dataBuffer
const processDataBuffer = (dataBuffer) => {
  if (dataBuffer) {
    try {
      let buffer;
      if (Buffer.isBuffer(dataBuffer)) {
        buffer = dataBuffer;
      } else if (typeof dataBuffer === 'string') {
        buffer = Buffer.from(dataBuffer, 'base64');
      } else if (dataBuffer instanceof Uint8Array || Array.isArray(dataBuffer)) {
        buffer = Buffer.from(dataBuffer);
      } else {
        return JSON.stringify(dataBuffer);
      }
      const dataRaw = iconv.decode(buffer, 'utf-8');
      const formattedData = dataRaw.replace(/^\uFEFF/, '');
      return formattedData;
    } catch (error) {
      console.error('Error processing dataBuffer:', error);
      return '';
    }
  }
  return null;
};

const RenderRequestResponse = ({ request, response, item, collection, width }) => {
  const [activeTab, setActiveTab] = useState('request');
  const [isRequestHeadersOpen, setIsRequestHeadersOpen] = useState(false);
  const [isResponseHeadersOpen, setIsResponseHeadersOpen] = useState(false);
  const [isRequestCookiesOpen, setIsRequestCookiesOpen] = useState(false);
  const [isResponseCookiesOpen, setIsResponseCookiesOpen] = useState(false);
  const [isRequestBodyOpen, setIsRequestBodyOpen] = useState(false);
  const [isResponseBodyOpen, setIsResponseBodyOpen] = useState(false);

  const requestHeaders = request.headers || request.requestHeaders || {};
  const responseHeaders = response.headers || response.responseHeaders || {};

  const {
    cookies: requestCookies,
    headers: filteredRequestHeaders,
  } = separateCookiesAndHeaders(requestHeaders);
  const {
    cookies: responseCookies,
    headers: filteredResponseHeaders,
  } = separateCookiesAndHeaders(responseHeaders);

  const showNetworkLogs = response.timeline && response.timeline.length > 0;

  return (
    <div className="text-sm overflow-hidden">
      {/* Tabs */}
      <div className="tabs-switcher flex mb-4">
        <button
          className={`mr-4 ${activeTab === 'request' ? 'active' : 'text-gray-400'}`}
          onClick={() => setActiveTab('request')}
        >
          Request
        </button>
        <button
          className={`mr-4 ${activeTab === 'response' ? 'active' : 'text-gray-400'}`}
          onClick={() => setActiveTab('response')}
        >
          Response
        </button>
        {showNetworkLogs && (
          <button
            className={`${activeTab === 'networkLogs' ? 'active' : 'text-gray-400'}`}
            onClick={() => setActiveTab('networkLogs')}
          >
            Network Logs
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Request Tab */}
        {activeTab === 'request' && (
          <div>
            {/* Method and URL */}
            <div className="mb-4">
              <span className={`${methodColors[request.method.toUpperCase()] || 'text-white'} font-bold`}>
                {request.method.toUpperCase()}
              </span>{' '}
              <span>{request.url}</span>
            </div>

            {/* Headers */}
            <div className="collapsible-section">
              <div className="section-header" onClick={() => setIsRequestHeadersOpen(!isRequestHeadersOpen)}>
                <span className="font-bold">
                  {isRequestHeadersOpen ? '▼' : '▶'} Headers
                  {filteredRequestHeaders && Object.keys(filteredRequestHeaders).length > 0 && 
                    <sup className="ml-1 font-medium">({Object.keys(filteredRequestHeaders).length})</sup>
                  }
                </span>
              </div>
              {isRequestHeadersOpen && (
                <div className="mt-2">
                  {filteredRequestHeaders && Object.keys(filteredRequestHeaders).length > 0 
                    ? renderHeaders(filteredRequestHeaders)
                    : <div className="text-gray-500">No Headers found</div>
                  }
                </div>
              )}
            </div>

            {/* Cookies */}
            <div className="collapsible-section">
              <div className="section-header" onClick={() => setIsRequestCookiesOpen(!isRequestCookiesOpen)}>
                <span className="font-bold">
                  {isRequestCookiesOpen ? '▼' : '▶'} Cookies
                  {requestCookies && Object.keys(requestCookies).length > 0 && 
                    <sup className="ml-1 font-medium">({Object.keys(requestCookies).length})</sup>
                  }
                </span>
              </div>
              {isRequestCookiesOpen && (
                <div className="mt-2">
                  {requestCookies && Object.keys(requestCookies).length > 0 
                    ? renderHeaders(requestCookies)
                    : <div className="text-gray-500">No Cookies found</div>
                  }
                </div>
              )}
            </div>

            {/* Body */}
            <div className="collapsible-section">
              <div className="section-header" onClick={() => setIsRequestBodyOpen(!isRequestBodyOpen)}>
                <span className="font-bold">
                  {isRequestBodyOpen ? '▼' : '▶'} Body
                </span>
              </div>
              {isRequestBodyOpen && (
                <div className="mt-2">
                  {request.data || request.dataBuffer || request?.requestBody ? (
                    <div className="h-96 overflow-auto">
                      <QueryResult
                        item={item}
                        collection={collection}
                        width={width}
                        data={request?.requestBody || request.data}
                        dataBuffer={request.dataBuffer}
                        headers={request.headers}
                        error={request.error}
                        key={item.filename}
                      />
                    </div>
                  ) : (
                    <div className="text-gray-500">No Body found</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Response Tab */}
        {activeTab === 'response' && (
          <div>
            {/* Status */}
            <div className="mb-4">
              <span className={`${statusColor(response.status || request.statusCode) || 'text-white'} font-bold`}>
                {response.status || request.statusCode}
              </span>{' '}
              <span>{response.statusText || request.statusText || ''}</span>
              {response.duration && <span className="text-sm text-gray-400 ml-2">{response.duration}ms</span>}
              {response.size && <span className="text-sm text-gray-400 ml-2">{response.size}B</span>}
            </div>

            {/* Headers */}
            <div className="collapsible-section">
              <div className="section-header" onClick={() => setIsResponseHeadersOpen(!isResponseHeadersOpen)}>
                <span className="font-bold">
                  {isResponseHeadersOpen ? '▼' : '▶'} Headers
                  {filteredResponseHeaders && Object.keys(filteredResponseHeaders).length > 0 && 
                    <sup className="ml-1 font-medium">({Object.keys(filteredResponseHeaders).length})</sup>
                  }
                </span>
              </div>
              {isResponseHeadersOpen && (
                <div className="mt-2">
                  {filteredResponseHeaders && Object.keys(filteredResponseHeaders).length > 0 
                    ? renderHeaders(filteredResponseHeaders)
                    : <div className="text-gray-500">No Headers found</div>
                  }
                </div>
              )}
            </div>

            {/* Cookies */}
            <div className="collapsible-section">
              <div className="section-header" onClick={() => setIsResponseCookiesOpen(!isResponseCookiesOpen)}>
                <span className="font-bold">
                  {isResponseCookiesOpen ? '▼' : '▶'} Cookies
                  {responseCookies && Object.keys(responseCookies).length > 0 && 
                    <sup className="ml-1 font-medium">({Object.keys(responseCookies).length})</sup>
                  }
                </span>
              </div>
              {isResponseCookiesOpen && (
                <div className="mt-2">
                  {responseCookies && Object.keys(responseCookies).length > 0 
                    ? renderHeaders(responseCookies)
                    : <div className="text-gray-500">No Cookies found</div>
                  }
                </div>
              )}
            </div>

            {/* Body */}
            <div className="collapsible-section">
              <div className="section-header" onClick={() => setIsResponseBodyOpen(!isResponseBodyOpen)}>
                <span className="font-bold">
                  {isResponseBodyOpen ? '▼' : '▶'} Body
                </span>
              </div>
              {isResponseBodyOpen && (
                <div className="mt-2">
                  {response.data || response.dataBuffer ? (
                    <div className="h-96 overflow-auto">
                      <QueryResult
                        item={item}
                        collection={collection}
                        width={width}
                        data={response.data}
                        dataBuffer={response.dataBuffer}
                        headers={response.headers}
                        error={response.error}
                        key={item.filename}
                      />
                    </div>
                  ) : (
                    <div className="text-gray-500">No Body found</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Network Logs Tab */}
        {activeTab === 'networkLogs' && showNetworkLogs && (
          <div className="bg-black/5 text-white p-2 network-logs rounded overflow-auto h-96">
            <pre className="whitespace-pre-wrap">
              {response.timeline.map((entry, index) => (
                <NetworkLogsEntry key={index} entry={entry} />
              ))}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

const NetworkLogsEntry = ({ entry }) => {
  const { type, message } = entry;
  let className = '';

  switch (type) {
    case 'request':
      className = 'text-blue-500';
      break;
    case 'response':
      className = 'text-green-500';
      break;
    case 'error':
      className = 'text-red-500';
      break;
    case 'tls':
      className = 'text-purple-500';
      break;
    case 'info':
      className = 'text-yellow-500';
      break;
    default:
      className = 'text-gray-400';
      break;
  }

  return (
    <div className={`${className}`}>
      <div>{message}</div>
    </div>
  );
};

// Helper functions
const renderHeaders = (data) => {
  if (Array.isArray(data)) {
    return (
      <div className="mt-2 text-sm">
        {data.map((header, index) => (
          <div key={index} className="flex mb-2">
            <div className="w-1/3 font-bold">{header.name}:</div>
            <div className="w-2/3">{String(header.value)}</div>
          </div>
        ))}
      </div>
    );
  } else {
    return (
      <div className="mt-2 text-sm">
        {Object.entries(data).map(([key, value], index) => (
          <div key={index} className="flex mb-2">
            <div className="w-1/3 font-bold">{key}:</div>
            <div className="w-2/3">{String(value)}</div>
          </div>
        ))}
      </div>
    );
  }
};

const separateCookiesAndHeaders = (headers) => {
  const cookies = {};
  let filteredHeaders = {};

  if (Array.isArray(headers)) {
    filteredHeaders = headers.filter((header) => header.enabled !== false);
    filteredHeaders.forEach((header) => {
      if (
        header.name.toLowerCase() === 'cookie' ||
        header.name.toLowerCase() === 'set-cookie'
      ) {
        cookies[header.name] = header.value;
      }
    });
  } else {
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === 'cookie' || key.toLowerCase() === 'set-cookie') {
        cookies[key] = value;
      } else {
        filteredHeaders[key] = value;
      }
    }
  }

  return { cookies, headers: filteredHeaders };
};

const OAuthRequestItem = ({ request, item, collection, width }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const { isSubRequest } = request;
  const url = request.url || '';
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const isImage = imageExtensions.some((ext) => url.toLowerCase().endsWith(ext));

  return (
    <div className="border-b border-gray-700 py-2">
      <div className="oauth-request-item-header cursor-pointer" onClick={toggleOpen}>
        <div className="flex justify-between items-center min-w-0">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="flex items-center flex-shrink-0">
              <span className={`${methodColors[request.method?.toUpperCase()] || 'text-white'} font-bold`}>
                {request.method?.toUpperCase()}
              </span>{' '}
            </div>
            <span className={`${statusColor(request.statusCode) || 'text-white'} font-bold`}>
                {request.statusCode}
                {request.statusText || ''}
            </span>
            <div className="flex items-center flex-shrink-0 space-x-2">
              {isSubRequest && <span className="request-label">API Request</span>}
              {isImage && <span className="request-label">Image</span>}
              {request.duration && <span className="text-sm text-gray-400">{request.duration}ms</span>}
              {request.size && <span className="text-sm text-gray-400">{request.size}B</span>}
              {request.state && <span className="text-sm text-gray-400">{request.state}</span>}
            </div>
          </div>
        </div>
        <div className="truncate text-sm text-[#9b9b9b] mt-1">{request.url}</div>
      </div>
      {isOpen && (
        <div className="oauth-request-item-content mt-2 text-sm">
          <RenderRequestResponse
            request={request}
            response={request}
            item={item}
            collection={collection}
            width={width}
          />
        </div>
      )}
    </div>
  );
};

export default Timeline;