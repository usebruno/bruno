import { useState } from "react";
import { RelativeTime } from "../TimelineItem/Common/Time/index";
import Status from "../TimelineItem/Common/Status/index";
import Method from "../TimelineItem/Common/Method/index";
import GrpcRequest from "./Request/index";
import GrpcResponse from "./Response/index";

const GrpcTimelineItem = ({ timestamp, request, response, item, collection, width,  }) => {
  const [isCollapsed, _toggleCollapse] = useState(false);
  const [activeTab, setActiveTab] = useState('request');
  const toggleCollapse = () => _toggleCollapse(prev => !prev);
  
  // Use requestSent if available, otherwise fall back to the request
  const effectiveRequest = item.requestSent || item.request || {};
  
  // Extract relevant data from request and response
  const { method, url = '' } = effectiveRequest;
  const { statusCode, statusText, messageCount, duration } = response || {};
  
  return (
    <div className="border-b-2 border-green-700/50 py-2">
      <div className="grpc-request-item-header cursor-pointer" onClick={toggleCollapse}>
        <div className="flex justify-between items-center min-w-0">
          <div className="flex items-center space-x-2 min-w-0">
            <Status statusCode={statusCode} statusText={statusText} />
            <Method method="gRPC" />
            <pre className="opacity-70">[{new Date(timestamp).toISOString()}]</pre>
            {messageCount > 0 && <span className="text-sm text-gray-400">{messageCount} message(s)</span>}
          </div>
          <span className="text-sm text-gray-400 flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap">
            <RelativeTime timestamp={timestamp} />
          </span>
        </div>
        <div className="truncate text-sm mt-1">{url}</div>
      </div>
      {isCollapsed && (
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
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {/* Request Tab */}
            {activeTab === 'request' && (
              <GrpcRequest 
                request={effectiveRequest} 
                item={item} 
                collection={collection} 
                width={width} 
              />
            )}

            {/* Response Tab */}
            {activeTab === 'response' && (
              <GrpcResponse response={response} item={item} collection={collection} width={width} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GrpcTimelineItem; 