import { useState } from "react";
import Headers from "../../TimelineItem/Common/Headers/index";
import Status from "../../TimelineItem/Common/Status/index";

const safeStringifyJSONIfNotString = (obj) => {
  if (obj === null || obj === undefined) return '';

  if (typeof obj === 'string') {
    return obj;
  }

  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return '[Unserializable Object]';
  }
};

const GrpcResponse = ({ collection, response, item, width }) => {
  const { 
    statusCode, 
    statusText, 
    statusDescription, 
    headers, 
    metadata,
    trailers,
    error,
    isError,
    duration,
    responses,
    messageCount
  } = response || {};

  return (
    <div>
      {/* Status */}
      <div className="mb-2">
        <Status statusCode={statusCode} statusText={statusText} />
        {duration && <span className="text-sm text-gray-400 ml-2">{duration}ms</span>}
        {statusDescription && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{statusDescription}</div>
        )}
      </div>

      {/* Error (if present) */}
      {isError && error && (
        <div className="mb-2">
          <div className="font-bold mb-1 text-red-500">Error</div>
          <div className="rounded px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
            <pre className="text-xs whitespace-pre-wrap">{error}</pre>
          </div>
        </div>
      )}

      {/* Headers */}
      <Headers headers={headers} type={'response'} title="Headers" />
      
      {/* Metadata (if present) */}
      {metadata && metadata.length > 0 && (
        <div className="mb-2">
          <div className="font-bold mb-1">Metadata</div>
          <div className="rounded px-2 py-1 bg-gray-100 dark:bg-gray-700">
            {metadata.map((meta, index) => (
              <div key={index} className="flex text-xs py-0.5">
                <div className="font-semibold mr-2">{meta.name}:</div>
                <div>{meta.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trailers (if present) */}
      {trailers && trailers.length > 0 && (
        <div className="mb-2">
          <div className="font-bold mb-1">Trailers</div>
          <div className="rounded px-2 py-1 bg-gray-100 dark:bg-gray-700">
            {trailers.map((trailer, index) => (
              <div key={index} className="flex text-xs py-0.5">
                <div className="font-semibold mr-2">{trailer.name}:</div>
                <div>{trailer.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Response Messages */}
      {responses && responses.length > 0 && (
        <div className="mb-2">
          <div className="font-bold mb-1">Messages ({responses.length})</div>
          {responses.map((msg, index) => (
            <div key={index} className="mb-2">
              <div className="text-xs font-semibold text-gray-500">Message {index + 1}</div>
              <div className="rounded px-2 py-1 overflow-auto bg-gray-100 dark:bg-gray-700">
                <pre className="text-xs whitespace-pre-wrap">
                  {safeStringifyJSONIfNotString(msg)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GrpcResponse; 