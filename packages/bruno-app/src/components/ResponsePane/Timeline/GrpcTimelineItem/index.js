import { useState } from 'react';
import { RelativeTime } from '../TimelineItem/Common/Time/index';
import Status from '../TimelineItem/Common/Status/index';
import {
  IconChevronDown,
  IconChevronRight,
  IconServer,
  IconDatabase,
  IconAlertCircle,
  IconCircleCheck,
  IconCircleX,
  IconX,
  IconSend
} from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

// Event type display names
const EventTypeNames = {
  metadata: 'Metadata',
  response: 'Response Message',
  request: 'Request',
  message: 'Message',
  status: 'Status',
  error: 'Error',
  end: 'Stream Ended',
  cancel: 'Cancelled'
};

const GrpcTimelineItem = ({ timestamp, request, response, eventType, eventData, item }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  // Use requestSent if available, otherwise fall back to request
  const effectiveRequest = item.requestSent || request || item.request || {};

  // Extract relevant data from request and response
  const { method, url = '' } = effectiveRequest;
  const { statusCode, statusText, duration } = response || {};

  // Get event-specific icon and class names
  const getEventIcon = () => {
    const iconClass = `icon-${eventType}`;
    switch (eventType) {
      case 'metadata':
        return <IconServer size={16} strokeWidth={1.5} className={iconClass} />;
      case 'response':
        return <IconSend style={{ transform: 'rotate(225deg)' }} size={16} strokeWidth={1.5} className={iconClass} />;
      case 'request':
        return <IconSend style={{ transform: 'rotate(45deg)' }} size={16} strokeWidth={1.5} className={iconClass} />;
      case 'message':
        return <IconSend style={{ transform: 'rotate(45deg)' }} size={16} strokeWidth={1.5} className={iconClass} />;
      case 'status':
        return <IconCircleCheck size={16} strokeWidth={1.5} className={iconClass} />;
      case 'error':
        return <IconAlertCircle size={16} strokeWidth={1.5} className={iconClass} />;
      case 'end':
        return <IconX size={16} strokeWidth={1.5} className={iconClass} />;
      case 'cancel':
        return <IconCircleX size={16} strokeWidth={1.5} className={iconClass} />;
      default:
        return <IconDatabase size={16} strokeWidth={1.5} />;
    }
  };

  const eventIcon = getEventIcon();
  const eventName = EventTypeNames[eventType] || 'Event';
  const eventClass = `event-${eventType}`;

  // Render appropriate content based on event type
  const renderEventContent = () => {
    const isClientStreaming = effectiveRequest.methodType === 'client-streaming' || effectiveRequest.methodType === 'bidi-streaming';

    switch (eventType) {
      case 'request':
        return (
          <div className="content-request">
            {effectiveRequest.headers && Object.keys(effectiveRequest.headers).length > 0 && (
              <div>
                <div className="content-request-label mb-1">Metadata</div>
                <div className="content-box grid grid-cols-2 gap-1">
                  {Object.entries(effectiveRequest.headers).map(([key, value], idx) => (
                    <div key={idx} className="contents">
                      <div className="overflow-hidden text-ellipsis">{key}:</div>
                      <div className="overflow-hidden text-ellipsis">{typeof value === 'string' ? value : '[Buffer Buffer]'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* gRPC Messages section */}
            {!isClientStreaming && effectiveRequest.body?.mode === 'grpc' && effectiveRequest.body?.grpc?.length > 0 && (
              <div>
                <div className="content-request-label mb-1">Message</div>
                <div className="space-y-1">
                  {effectiveRequest.body.grpc.filter((_, index) => index === 0).map((message, idx) => (
                    <div key={idx} className="content-box">
                      <pre className="overflow-auto max-h-[150px]">
                        {typeof message.content === 'string'
                          ? message.content
                          : JSON.stringify(message.content, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'message':
        return (
          <div className="content-message">
            <div>
              <div className="content-message-label mb-1">Message</div>
              <pre className="content-box overflow-auto max-h-[200px]">
                {typeof eventData === 'string'
                  ? eventData
                  : JSON.stringify(eventData, null, 2)}
              </pre>
            </div>
          </div>
        );

      case 'metadata':
        return (
          <div className="content-metadata">
            <div>
              <div className="content-metadata-label mb-1">Metadata Headers</div>
              {response.metadata && response.metadata.length > 0 ? (
                <div className="content-box grid grid-cols-2 gap-1">
                  {response.metadata.map((header, idx) => (
                    <div key={idx} className="contents">
                      <div>{header.name}:</div>
                      <div>{header.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-text">No metadata headers</div>
              )}
            </div>
          </div>
        );

      case 'response':
        // For message responses, show the response data
        return (
          <div className="content-response">
            <div>
              <div className="content-response-label mb-1">
                Response Message #{(response?.responses?.length) || 0}
              </div>
              {response?.responses && response.responses.length > 0 ? (
                <pre className="content-box overflow-auto max-h-[200px]">
                  {JSON.stringify(response.responses[response.responses.length - 1], null, 2)}
                </pre>
              ) : (
                <div className="empty-text">Empty message</div>
              )}
            </div>
          </div>
        );

      case 'status':
        // For status events, show status and trailers
        return (
          <div className="content-status">
            <div className="flex items-center gap-2">
              <Status statusCode={statusCode} statusText={statusText} />
            </div>

            {response.statusDescription && (
              <div>{response.statusDescription}</div>
            )}

            {response.trailers && response.trailers.length > 0 && (
              <div>
                <div className="content-status-label mb-1">Trailers</div>
                <div className="content-box grid grid-cols-2 gap-1">
                  {response.trailers.map((trailer, idx) => (
                    <div key={idx} className="contents">
                      <div>{trailer.name}:</div>
                      <div>{trailer.value || ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'error':
        // For error events, show error details
        return (
          <div className="content-error">
            <div>
              <div className="content-error-label mb-1">Error</div>
              <div>{response.error || 'Unknown error'}</div>
            </div>

            <div className="flex items-center gap-2">
              <Status statusCode={statusCode} statusText={statusText} />
            </div>

            {response.trailers && response.trailers.length > 0 && (
              <div>
                <div className="content-error-label mb-1">Error Metadata</div>
                <div className="content-box grid grid-cols-2 gap-1">
                  {response.trailers.map((trailer, idx) => (
                    <div key={idx} className="contents">
                      <div>{trailer.name}:</div>
                      <div>{trailer.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'end':
        // For end events, show summary
        return (
          <div className="content-end">
            <div>Stream Ended</div>
            <div>
              Total messages: {(response?.responses?.length) || 0}
            </div>
          </div>
        );

      case 'cancel':
        // For cancel events, show cancellation info
        return (
          <div className="content-cancel">
            <div className="content-cancel-label mb-1">Stream Cancelled</div>
            <div>{response.statusDescription || 'The gRPC stream was cancelled'}</div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <StyledWrapper className={`${eventClass} pl-1 mb-2`}>
      <div className="event-header" onClick={toggleCollapse}>
        {isCollapsed ? <IconChevronRight size={16} strokeWidth={1.5} /> : <IconChevronDown size={16} strokeWidth={1.5} />}
        <div className="event-icon-container">
          {eventIcon}
        </div>
        <span>{eventName}</span>
        {eventType === 'request' && effectiveRequest.methodType && (
          <span className="method-type-badge px-2 py-0.5">
            {effectiveRequest.methodType}
          </span>
        )}
        {eventType === 'status' && (
          <div className="flex items-center gap-2">
            <Status statusCode={statusCode} statusText={statusText} />
          </div>
        )}
        <pre className="event-timestamp">[{new Date(timestamp).toISOString()}]</pre>
        <span className="timestamp-text ml-auto">
          <RelativeTime timestamp={timestamp} />
        </span>
      </div>

      {/* Always show the URL */}
      <div className="url-text">{url}</div>

      {/* Expanded content - only show for non-status items */}
      {!isCollapsed && renderEventContent()}
    </StyledWrapper>
  );
};

export default GrpcTimelineItem;
