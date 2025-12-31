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
          <div className="content-request mt-2 p-2">

            {effectiveRequest.headers && Object.keys(effectiveRequest.headers).length > 0 && (
              <div className="mb-3">
                <div className="content-request-label text-xs font-medium mb-1">Metadata</div>
                <div className="content-box grid grid-cols-2 gap-1 p-2">
                  {Object.entries(effectiveRequest.headers).map(([key, value], idx) => (
                    <div key={idx} className="contents">
                      <div className="text-xs font-medium overflow-hidden text-ellipsis">{key}:</div>
                      <div className="text-xs overflow-hidden text-ellipsis">{typeof value === 'string' ? value : '[Buffer Buffer]'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* gRPC Messages section */}
            {!isClientStreaming && effectiveRequest.body?.mode === 'grpc' && effectiveRequest.body?.grpc?.length > 0 && (
              <div>
                <div className="content-request-label text-xs font-medium mb-1">
                  Message
                </div>
                <div className="space-y-2">
                  {effectiveRequest.body.grpc.filter((_, index) => index === 0).map((message, idx) => (
                    <div key={idx} className="content-box p-2">
                      <pre className="text-xs overflow-auto max-h-[150px]">
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
          <div className="content-message mt-2 p-2">
            <div className="content-message-label font-medium mb-1">Message</div>
            <pre className="text-xs content-box p-2 overflow-auto max-h-[200px]">
              {typeof eventData === 'string'
                ? eventData
                : JSON.stringify(eventData, null, 2)}
            </pre>
          </div>
        );

      case 'metadata':
        return (
          <div className="content-metadata mt-2 p-2">
            <div className="content-metadata-label font-medium mb-1">Metadata Headers</div>
            {response.metadata && response.metadata.length > 0 ? (
              <div className="grid grid-cols-2 gap-1">
                {response.metadata.map((header, idx) => (
                  <div key={idx} className="contents">
                    <div className="text-xs font-medium">{header.name}:</div>
                    <div className="text-xs">{header.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-text italic">No metadata headers</div>
            )}
          </div>
        );

      case 'response':
        // For message responses, show the response data
        return (
          <div className="content-response mt-2 p-2">
            <div className="content-response-label font-medium mb-1">
              Response Message #{(response?.responses?.length) || 0}
            </div>
            {response?.responses && response.responses.length > 0 ? (
              <pre className="text-xs content-box p-2 overflow-auto max-h-[200px]">
                {JSON.stringify(response.responses[response.responses.length - 1], null, 2)}
              </pre>
            ) : (
              <div className="empty-text italic">Empty message</div>
            )}
          </div>
        );

      case 'status':
        // For status events, show status and trailers
        return (
          <div className="content-status mt-2 p-2">
            <div className="flex items-center gap-2 mb-1">
              <Status statusCode={statusCode} statusText={statusText} />
            </div>

            {response.statusDescription && (
              <div className="mb-2">{response.statusDescription}</div>
            )}

            {response.trailers && response.trailers.length > 0 && (
              <>
                <div className="content-status-label font-medium mt-2 mb-1">Trailers</div>
                <div className="grid grid-cols-2 gap-1">
                  {response.trailers.map((trailer, idx) => (
                    <div key={idx} className="contents">
                      <div className="text-xs font-medium">{trailer.name}:</div>
                      <div className="text-xs">{trailer.value || ''}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case 'error':
        // For error events, show error details
        return (
          <div className="content-error mt-2 p-2">
            <div className="content-error-label font-medium mb-1">Error</div>
            <div className="mb-2">{response.error || 'Unknown error'}</div>

            <div className="flex items-center gap-2">
              <Status statusCode={statusCode} statusText={statusText} />
            </div>

            {response.trailers && response.trailers.length > 0 && (
              <>
                <div className="content-error-label font-medium mt-2 mb-1">Error Metadata</div>
                <div className="grid grid-cols-2 gap-1">
                  {response.trailers.map((trailer, idx) => (
                    <div key={idx} className="contents">
                      <div className="text-xs font-medium">{trailer.name}:</div>
                      <div className="text-xs">{trailer.value}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case 'end':
        // For end events, show summary
        return (
          <div className="content-end mt-2 p-2">
            <div className="font-medium mb-1">Stream Ended</div>
            <div>
              Total messages: {(response?.responses?.length) || 0}
            </div>
          </div>
        );

      case 'cancel':
        // For cancel events, show cancellation info
        return (
          <div className="content-cancel mt-2 p-2">
            <div className="content-cancel-label font-medium mb-1">Stream Cancelled</div>
            <div>{response.statusDescription || 'The gRPC stream was cancelled'}</div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <StyledWrapper className={`${eventClass} pl-3 py-2 mb-3`}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={toggleCollapse}>
        {isCollapsed ? <IconChevronRight size={16} strokeWidth={1.5} /> : <IconChevronDown size={16} strokeWidth={1.5} />}
        {eventIcon}
        <span className="font-medium">{eventName}</span>
        {eventType === 'request' && effectiveRequest.methodType && (
          <span className="method-type-badge px-2 py-0.5 text-xs">
            {effectiveRequest.methodType}
          </span>
        )}
        {eventType === 'status' && (
          <div className="flex items-center gap-2">
            <Status statusCode={statusCode} statusText={statusText} />
          </div>
        )}
        <pre className="text-xs opacity-70">[{new Date(timestamp).toISOString()}]</pre>
        <span className="timestamp-text text-xs ml-auto">
          <RelativeTime timestamp={timestamp} />
        </span>
      </div>

      {/* Always show the URL */}
      <div className="url-text text-xs mt-1 ml-6">{url}</div>

      {/* Expanded content - only show for non-status items */}
      {!isCollapsed && renderEventContent()}
    </StyledWrapper>
  );
};

export default GrpcTimelineItem;
