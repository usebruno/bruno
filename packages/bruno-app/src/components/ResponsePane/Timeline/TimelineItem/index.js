import { useState } from "react";
import Network from "./Network/index";
import Request from "./Request/index";
import Response from "./Response/index";
import Method from "./Common/Method/index";
import Status from "./Common/Status/index";
import { RelativeTime } from "./Common/Time/index";

const TimelineItem = ({ timestamp, request, response, item, collection, width, isOauth2, hideTimestamp = false }) => {
  const [isCollapsed, _toggleCollapse] = useState(false);
  const [activeTab, setActiveTab] = useState('request');
  const toggleCollapse = () => _toggleCollapse(prev => !prev);
  const { method, status, statusCode, statusText, url = '' } = request || {};
  const { status: responseStatus, statusCode: responseStatusCode, statusText: responseStatusText } = response || {};
  const showNetworkLogs = response.timeline && response.timeline.length > 0;

  return (
    <div className={`border-b-2 ${isOauth2 ? 'border-indigo-700/50' : 'border-amber-700/50' } py-2`}>
      <div className="oauth-request-item-header cursor-pointer" onClick={toggleCollapse}>
        <div className="flex justify-between items-center min-w-0">
          <div className="flex items-center space-x-2 min-w-0">
            <Status statusCode={responseStatus || responseStatusCode} statusText={responseStatusText} />
            <Method method={method} />
            <Status statusCode={status || statusCode} statusText={statusText} />
            {isOauth2 ? <pre className="opacity-50">[oauth2.0]</pre> : null}
            {!hideTimestamp && (
              <>
                <pre className="opacity-70">[{new Date(timestamp).toISOString()}]</pre>
                <span className="text-sm text-gray-400 flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  <RelativeTime timestamp={timestamp} />
                </span>
              </>
            )}
          </div>
        </div>
        <div className="truncate text-sm mt-1">{url}</div>
      </div>
      {isCollapsed && (<div className="text-sm overflow-hidden">
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
            <Request request={request} item={item} collection={collection} width={width} />
          )}

          {/* Response Tab */}
          {activeTab === 'response' && (
            <Response response={response} item={item} collection={collection} width={width} />
          )}

          {/* Network Logs Tab */}
          {activeTab === 'networkLogs' && showNetworkLogs && (
            <Network logs={response?.timeline} />
          )}
        </div>
      </div>)}
    </div>
  );
};

export default TimelineItem;