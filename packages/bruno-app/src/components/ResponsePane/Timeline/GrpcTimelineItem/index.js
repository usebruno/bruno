import { useState } from "react";
import { RelativeTime } from "../TimelineItem/Common/Time/index";
import Status from "../TimelineItem/Common/Status/index";
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

// Icons for different event types
const EventTypeIcons = {
  metadata: <IconServer size={16} strokeWidth={1.5} className="text-blue-500" />,
  response: <IconSend style={{ transform: 'rotate(225deg)' }} size={16} strokeWidth={1.5} className="text-green-500" />,
  request: <IconSend style={{ transform: 'rotate(45deg)' }} size={16} strokeWidth={1.5} className="text-orange-500" />,
  message: <IconSend style={{ transform: 'rotate(45deg)' }} size={16} strokeWidth={1.5} className="text-orange-500" />,
  status: <IconCircleCheck size={16} strokeWidth={1.5} className="text-purple-500" />,
  error: <IconAlertCircle size={16} strokeWidth={1.5} className="text-red-500" />,
  end: <IconX size={16} strokeWidth={1.5} className="text-gray-500" />,
  cancel: <IconCircleX size={16} strokeWidth={1.5} className="text-amber-500" />
};

// Event type display names
const EventTypeNames = {
  metadata: "Metadata",
  response: "Response Message",
  request: "Request",
  message: "Message",
  status: "Status",
  error: "Error",
  end: "Stream Ended",
  cancel: "Cancelled"
};

// Colors for different event types
const EventTypeColors = {
  metadata: "border-blue-500/20",
  response: "border-green-500/20",
  request: "border-orange-500/20",
  message: "border-orange-500/20",
  status: "border-purple-500/20", 
  error: "border-red-500/20",
  end: "border-gray-500/20",
  cancel: "border-amber-500/20"
};

const GrpcTimelineItem = ({ timestamp, request, response, eventType, eventData, item }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const toggleCollapse = () => setIsCollapsed(prev => !prev);
  
  // Use requestSent if available, otherwise fall back to request
  const effectiveRequest = item.requestSent || request || item.request || {};
  
  // Extract relevant data from request and response
  const { method, url = '' } = effectiveRequest;
  const { statusCode, statusText, duration } = response || {};
  
  // Get event-specific icon and color
  const eventIcon = EventTypeIcons[eventType] || <IconDatabase size={16} strokeWidth={1.5} />;
  const eventColor = EventTypeColors[eventType] || "border-gray-500/50";
  const eventName = EventTypeNames[eventType] || "Event";

  
  // Render appropriate content based on event type
  const renderEventContent = () => {
  
    const isClientStreaming = effectiveRequest.methodType === 'client-streaming' || effectiveRequest.methodType === 'bidi-streaming';

    switch(eventType) {
      case 'request':
        return (
          <div className="mt-2 bg-orange-50 dark:bg-orange-900/10 rounded p-2">
                        
            {effectiveRequest.headers && Object.keys(effectiveRequest.headers).length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium mb-1 text-orange-700 dark:text-orange-400">Metadata</div>
                <div className="grid grid-cols-2 gap-1 bg-white dark:bg-gray-800 p-2 rounded">
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
                <div className="text-xs font-medium mb-1 text-orange-700 dark:text-orange-400">
                  Message
                </div>
                <div className="space-y-2">
                  {effectiveRequest.body.grpc.filter((_, index) => index === 0).map((message, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded">
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
          <div className="mt-2 bg-orange-50 dark:bg-orange-900/10 rounded p-2">
            <div className="font-semibold mb-1 text-orange-700 dark:text-orange-400">Message</div>
            <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded overflow-auto max-h-[200px]">
                {typeof eventData === 'string' 
                  ? eventData 
                  : JSON.stringify(eventData, null, 2)}
              </pre> 
          </div>
        );

      case 'metadata':
        return (
          <div className="mt-2 bg-blue-50 dark:bg-blue-900/10 rounded p-2">
            <div className="font-semibold mb-1 text-blue-700 dark:text-blue-400">Metadata Headers</div>
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
              <div className="text-sm italic text-gray-500">No metadata headers</div>
            )}
          </div>
        );
        
      case 'response':
        // For message responses, show the response data
        return (
          <div className="mt-2 bg-green-50 dark:bg-green-900/10 rounded p-2">
            <div className="font-semibold mb-1 text-green-700 dark:text-green-400">
              Response Message #{(response?.responses?.length) || 0}
            </div>
            {response?.responses && response.responses.length > 0 ? (
              <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded overflow-auto max-h-[200px]">
                {JSON.stringify(response.responses[response.responses.length - 1], null, 2)}
              </pre>
            ) : (
              <div className="text-sm italic text-gray-500">Empty message</div>
            )}
          </div>
        );
        
      case 'status':
        // For status events, show status and trailers
        return (
          <div className="mt-2 bg-purple-50 dark:bg-purple-900/10 rounded p-2">
            <div className="flex items-center gap-2 mb-1">
              <Status statusCode={statusCode} statusText={statusText} />
            </div>
            
            {response.statusDescription && (
              <div className="text-sm mb-2">{response.statusDescription}</div>
            )}
            
            {response.trailers && response.trailers.length > 0 && (
              <>
                <div className="font-semibold text-sm mt-2 mb-1 text-purple-700 dark:text-purple-400">Trailers</div>
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
          <div className="mt-2 bg-red-50 dark:bg-red-900/10 rounded p-2">
            <div className="font-semibold mb-1 text-red-700 dark:text-red-400">Error</div>
            <div className="text-sm mb-2">{response.error || "Unknown error"}</div>
            
            <div className="flex items-center gap-2">
              <Status statusCode={statusCode} statusText={statusText} />
            </div>
            
            {response.trailers && response.trailers.length > 0 && (
              <>
                <div className="font-semibold text-sm mt-2 mb-1 text-red-700 dark:text-red-400">Error Metadata</div>
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
          <div className="mt-2 bg-gray-50 dark:bg-gray-700/30 rounded p-2">
            <div className="font-semibold mb-1">Stream Ended</div>
            <div className="text-sm">
              Total messages: {(response?.responses?.length) || 0}
            </div>
          </div>
        );
        
      case 'cancel':
        // For cancel events, show cancellation info
        return (
          <div className="mt-2 bg-amber-50 dark:bg-amber-900/10 rounded p-2">
            <div className="font-semibold mb-1 text-amber-700 dark:text-amber-400">Stream Cancelled</div>
            <div className="text-sm">{response.statusDescription || "The gRPC stream was cancelled"}</div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className={`border-l-4 ${eventColor} pl-3 py-2 mb-3`}>
      <div className={`flex items-center gap-2 cursor-pointer`} onClick={toggleCollapse}>
        {isCollapsed ? <IconChevronRight size={16} strokeWidth={1.5} /> : <IconChevronDown size={16} strokeWidth={1.5} />}
        {eventIcon}
        <span className="font-medium text-sm">{eventName}</span>
        {eventType === 'request' && effectiveRequest.methodType && (
          <span className="px-2 py-0.5 text-xs rounded bg-orange-100 dark:bg-orange-800/30 text-orange-700 dark:text-orange-300">
            {effectiveRequest.methodType}
          </span>
        )}
        {eventType === 'status' && (
          <div className="flex items-center gap-2">
            <Status statusCode={statusCode} statusText={statusText} />
          </div>
        )}
        <pre className="text-xs opacity-70">[{new Date(timestamp).toISOString()}]</pre>
        <span className="text-xs text-gray-500 ml-auto">
          <RelativeTime timestamp={timestamp} />
        </span>
      </div>
      
      {/* Always show the URL */}
      <div className="text-xs text-gray-500 mt-1 ml-6">{url}</div>
      
      {/* Expanded content - only show for non-status items */}
      {!isCollapsed && renderEventContent()}
    </div>
  );
};

export default GrpcTimelineItem; 