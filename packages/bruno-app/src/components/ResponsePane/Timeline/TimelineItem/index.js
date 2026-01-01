import { useState } from 'react';
import Network from './Network/index';
import Request from './Request/index';
import Response from './Response/index';
import Method from './Common/Method/index';
import Status from './Common/Status/index';
import { RelativeTime } from './Common/Time/index';
import StyledWrapper from './StyledWrapper';

const TimelineItem = ({ timestamp, request, response, item, collection, isOauth2, hideTimestamp = false }) => {
  const [isCollapsed, _toggleCollapse] = useState(false);
  const [activeTab, setActiveTab] = useState('request');
  const toggleCollapse = () => _toggleCollapse((prev) => !prev);
  const { method, status, statusCode, statusText, url = '' } = request || {};
  const { status: responseStatus, statusCode: responseStatusCode, statusText: responseStatusText } = response || {};
  const showNetworkLogs = response.timeline && response.timeline.length > 0;

  return (
    <StyledWrapper>
      <div className={`timeline-item ${isOauth2 ? 'timeline-item--oauth2' : ''}`}>
        <div className="timeline-item-header" onClick={toggleCollapse}>
          <div className="timeline-item-header-content">
            <div className="timeline-item-header-items">
              <Status statusCode={responseStatus || responseStatusCode} statusText={responseStatusText} />
              <Method method={method} />
              <Status statusCode={status || statusCode} statusText={statusText} />
              {isOauth2 && <pre className="timeline-item-oauth-label">[oauth2.0]</pre>}
              {!hideTimestamp && (
                <>
                  <pre className="timeline-item-timestamp-iso">[{new Date(timestamp).toISOString()}]</pre>
                  <span className="timeline-item-timestamp">
                    <RelativeTime timestamp={timestamp} />
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="timeline-item-url">{url}</div>
        </div>
        {isCollapsed && (
          <div className="timeline-item-content">
            {/* Tabs */}
            <div className="timeline-item-tabs">
              <button
                className={`timeline-item-tab ${activeTab === 'request' ? 'timeline-item-tab--active' : ''}`}
                onClick={() => setActiveTab('request')}
              >
                Request
              </button>
              <button
                className={`timeline-item-tab ${activeTab === 'response' ? 'timeline-item-tab--active' : ''}`}
                onClick={() => setActiveTab('response')}
              >
                Response
              </button>
              {showNetworkLogs && (
                <button
                  className={`timeline-item-tab ${activeTab === 'networkLogs' ? 'timeline-item-tab--active' : ''}`}
                  onClick={() => setActiveTab('networkLogs')}
                >
                  Network Logs
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="timeline-item-tab-content">
              {/* Request Tab */}
              {activeTab === 'request' && (
                <Request request={request} item={item} collection={collection} />
              )}

              {/* Response Tab */}
              {activeTab === 'response' && (
                <Response response={response} item={item} collection={collection} />
              )}

              {/* Network Logs Tab */}
              {activeTab === 'networkLogs' && showNetworkLogs && (
                <Network logs={response?.timeline} />
              )}
            </div>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default TimelineItem;
