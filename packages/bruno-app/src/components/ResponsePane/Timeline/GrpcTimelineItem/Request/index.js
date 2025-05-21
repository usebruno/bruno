import { useState } from "react";
import Headers from "../../TimelineItem/Common/Headers/index";

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

const GrpcRequest = ({ collection, request, item, width }) => {
  // Use the requestSent object if available, otherwise fall back to request
  const effectiveRequest = item.requestSent || request || {};
  const { url, headers, metadata, body, method, methodType } = effectiveRequest;
  
  // Get messages from the body
  const messages = body?.grpc || [];

  const timestamp = effectiveRequest.timestamp ? new Date(effectiveRequest.timestamp).toISOString() : 'N/A';
  console.log('GrpcRequest effectiveRequest', effectiveRequest);
  
  return (
    <div>
      {/* Service and Method Info */}
      <div className="mb-2">
        <div className="text-sm font-semibold">Method: {method || 'Not specified'}</div>
        <div className="text-sm font-semibold">Type: {methodType || 'Not specified'}</div>
        <div className="text-sm font-semibold">Timestamp: {timestamp}</div>
      </div>

      {/* URL */}       
      <div className="mb-1 flex gap-2">
        <pre className="whitespace-pre-wrap">{url}</pre>
      </div>

      {/* Headers */}
      <Headers headers={headers} type={'request'} title="Headers" />
      
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

      {/* Request Message */}
      {messages && messages.length > 0 && (
        <div className="mb-2">
          <div className="font-bold mb-1">Message</div>
          <div className="rounded px-2 py-1 overflow-auto bg-gray-100 dark:bg-gray-700">
            <pre className="text-xs whitespace-pre-wrap">
              {safeStringifyJSONIfNotString(messages)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrpcRequest; 