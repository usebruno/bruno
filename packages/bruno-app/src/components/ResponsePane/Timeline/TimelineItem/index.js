import { useState } from 'react';
import { useTheme } from 'providers/Theme';
import Network from './Network/index';
import Request from './Request/index';
import Response from './Response/index';
import Method from './Common/Method/index';
import Status from './Common/Status/index';
import { RelativeTime } from './Common/Time/index';
import StyledWrapper from './StyledWrapper';

const TimelineItem = ({ timestamp, request, response, item, collection, isOauth2, hideTimestamp = false }) => {
  const { theme } = useTheme();
  const [isCollapsed, _toggleCollapse] = useState(false);
  const [activeTab, setActiveTab] = useState('request');
  const toggleCollapse = () => _toggleCollapse((prev) => !prev);
  const { method, status, statusCode, statusText, url = '' } = request || {};
  const { status: responseStatus, statusCode: responseStatusCode, statusText: responseStatusText } = response || {};
  const showNetworkLogs = response.timeline && response.timeline.length > 0;

  return (
    <StyledWrapper>
      <div className={`timeline-item ${isOauth2 ? 'timeline-item--oauth2' : ''}`}>
        <div className="oauth-request-item-header relative cursor-pointer flex items-center justify-between gap-3 min-w-0" onClick={toggleCollapse}>
          <Status statusCode={responseStatus || responseStatusCode} statusText={responseStatusText} />
          <div className="flex items-center gap-1">
            <Method method={method} />
            <div className="truncate flex-1 min-w-0">{url}</div>
            {isOauth2 && <span className="text-xs flex-shrink-0" style={{ color: theme.colors.text.muted }}>[oauth2.0]</span>}
          </div>
          {!hideTimestamp && (
            <span className="flex-shrink-0 ml-auto">
              <RelativeTime timestamp={timestamp} />
            </span>
          )}
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
