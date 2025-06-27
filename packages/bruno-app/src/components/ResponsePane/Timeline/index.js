import React, { useState } from 'react';
import StyledWrapper from './StyledWrapper';
import { getEffectiveAuthSource } from 'utils/collections';
import TimelineItem from './TimelineItem/index';

const Timeline = ({ collection, item, width }) => {
  // Get the effective auth source if auth mode is inherit
  const authSource = getEffectiveAuthSource(collection, item);

  // Filter timeline entries based on new rules
  const combinedTimeline = ([...(collection.timeline || [])]).filter(obj => {
    // Always show entries for this item
    if (obj.itemUid === item.uid) return true;

    // For OAuth2 entries, also show if auth is inherited
    if (obj.type === 'oauth2' && authSource) {
      if (authSource.type === 'folder' && obj.folderUid === authSource.uid) return true;
      if (authSource.type === 'collection' && !obj.folderUid) return true;
    }

    return false;
  }).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <StyledWrapper
      className="pb-4 w-full flex flex-grow flex-col"
      style={{ maxWidth: width - 60, overflowWrap: 'break-word' }}
    >
      {combinedTimeline.map((event, index) => {
        if (event.type === 'request') {
          const { data, timestamp } = event;
          const { request, response } = data;
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
        } else if (event.type === 'oauth2') {
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
                      <div className='ml-4'>
                        <TimelineItem
                          key={idx}
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
    </StyledWrapper>
  );
};

export default Timeline;