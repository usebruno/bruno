import React, { useRef } from 'react';
import StyledWrapper from './StyledWrapper';
import { findItemInCollection, findParentItemInCollection } from 'utils/collections/index';
import { get } from 'lodash';
import TimelineItem from './TimelineItem/index';
import GrpcTimelineItem from './GrpcTimelineItem/index';
import ScrollIndicator from 'components/ScrollIndicator';

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

// Helper function to check if a request is a gRPC request

const Timeline = ({ collection, item, width }) => {
  // Get the effective auth source if auth mode is inherit
  const authSource = getEffectiveAuthSource(collection, item);
  const isGrpcRequest = item.type === 'grpc-request';
  
  // Create a ref for the scrollable container
  const timelineContainerRef = useRef(null);

  console.log('collection?.timeline', collection?.timeline);

  // Filter timeline entries based on new rules
  const  combinedTimeline = ([...(collection?.timeline || [])]).filter(obj => {
    // Always show entries for this item
    if (obj.itemUid === item.uid) return true;

    // For OAuth2 entries, also show if auth is inherited
    if (obj.type === 'oauth2' && authSource) {
      if (authSource.type === 'folder' && obj.folderUid === authSource.uid) return true;
      if (authSource.type === 'collection' && !obj.folderUid) return true;
    }

    return false;
  }).sort((a, b) => b.timestamp - a.timestamp);

  console.log('grpc timeline', collection?.timeline);
  console.log('combinedTimeline', combinedTimeline);

  // For gRPC requests, create a summary of events
  const grpcSummary = isGrpcRequest ? {
    totalEvents: combinedTimeline.filter(e => e.type === 'grpc').length,
    messageCount: item.response?.messageCount || 0,
    status: item.response?.statusCode,
    statusText: item.response?.statusText,
    error: item.response?.error,
    duration: item.response?.duration,
    eventCounts: combinedTimeline
      .filter(e => e.type === 'grpc')
      .reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {})
  } : null;

  return (
    <StyledWrapper
      className="pb-4 w-full flex flex-grow flex-col relative"
      style={{ overflowWrap: 'break-word' }}
    >
      {/* Timeline container with hidden scrollbar */}
      <div 
        ref={timelineContainerRef}
        className="timeline-container flex-1 overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 250px)' }}
      >
        {/* gRPC Summary Panel */}
        {isGrpcRequest && grpcSummary && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded p-3 mb-4">
            <h3 className="text-sm font-semibold mb-2">gRPC Stream Summary</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">         
              <div>Messages Received:</div>
              <div>{grpcSummary.messageCount}</div>
              
              <div>Final Status:</div>
              <div className="flex items-center">
                {grpcSummary.status !== null ? (
                  <>
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                      grpcSummary.status === 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    {grpcSummary.status} {grpcSummary.statusText}
                  </>
                ) : (
                  <span className="text-gray-500">Pending</span>
                )}
              </div>
              
              {grpcSummary.duration && (
                <>
                  <div>Duration:</div>
                  <div>{grpcSummary.duration}ms</div>
                </>
              )}
              
              {grpcSummary.error && (
                <>
                  <div>Error:</div>
                  <div className="text-red-500">{grpcSummary.error}</div>
                </>
              )}
              
            </div>
          </div>
        )}
        
        {combinedTimeline.map((event, index) => {
          console.log('event', event);
          // Handle regular HTTP requests
          if (event.type === 'request') {
            console.log('grpc-event', event);

            const { data, timestamp, eventType } = event;
            const { request, response,  eventData = {}, timestamp: eventTimestamp = timestamp } = data;
            
            if (isGrpcRequest) {
              return (
                <div key={index} className="timeline-event mb-2">
                  <GrpcTimelineItem
                    timestamp={eventTimestamp} 
                    request={request}
                    response={response}
                    eventType={eventType}
                    eventData={eventData}
                    item={item}
                    collection={collection}
                    width={width}
                  />
                </div>
              );
            }
            
            // Regular HTTP request
            return (
              <div key={index} className="timeline-event mb-2">
                <TimelineItem
                  timestamp={timestamp}
                  request={request}
                  response={response}
                  item={item}
                  collection={collection}
                  width={width}
                />
              </div>
            );
          }
          // Handle OAuth2 events
          else if (event.type === 'oauth2') {
            const { data, timestamp } = event;
            const { debugInfo } = data;
            return (
              <div key={index} className="timeline-event">
                <div className="timeline-event-header cursor-pointer flex items-center">
                  <div className="flex items-center">
                    <span className="font-bold">OAuth2.0 Calls</span>
                  </div>
                </div>
                <div className="mt-2">
                  {debugInfo && debugInfo.length > 0 ? (
                    debugInfo.map((data, idx) => (
                      <div className='ml-4' key={idx}>
                        <TimelineItem
                          timestamp={timestamp}
                          request={data?.request}
                          response={data?.response}
                          item={item}
                          collection={collection}
                          width={width - 50}
                          isOauth2={true}
                        />
                      </div>
                    ))
                  ) : (
                    <div>No debug information available.</div>
                  )}
                </div>
              </div>
            );
          }
          
          return null;
        })}
      </div>
      
      {/* Use the improved ScrollIndicator component */}
      <ScrollIndicator 
        containerRef={timelineContainerRef} 
        dependencies={[collection?.timeline]} 
      />
    </StyledWrapper>
  );
};

export default Timeline;