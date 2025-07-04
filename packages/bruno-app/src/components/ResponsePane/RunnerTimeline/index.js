import React, { useMemo } from 'react';
import forOwn from 'lodash/forOwn';
import StyledWrapper from './StyledWrapper';
import TimelineItem from '../Timeline/TimelineItem';

const RunnerTimeline = ({ request = {}, response = {}, item, collection, width }) => {
  const requestHeaders = [];

  forOwn(request.headers, (value, key) => {
    requestHeaders.push({
      name: key,
      value
    });
  });

  const oauth2Events = useMemo(
    () =>
      collection?.timeline?.filter(
        (event) => event.type === 'oauth2' && event.itemUid === item.uid
      ) || [],
    [collection?.timeline, item.uid]
  );

  return (
    <StyledWrapper className="pb-4 w-full">
      {/* Show the main request/response timeline item */}
      <TimelineItem
        request={request}
        response={response}
        item={item}
        collection={collection}
        width={width}
        hideTimestamp={true}
      />
      
      {oauth2Events.map((event, index) => {
        const { data, timestamp } = event;
        const { debugInfo } = data;
        return (
          <div key={`oauth2-${index}`} className="timeline-event mt-4">
            <div className="timeline-event-header cursor-pointer flex items-center">
              <div className="flex items-center">
                <span className="font-bold">OAuth2.0 Calls</span>
              </div>
            </div>
            <div className="mt-2">
              {debugInfo && debugInfo.length > 0 ? (
                debugInfo.map((data, idx) => (
                  <div key={idx} className='ml-4'>
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
      })}
    </StyledWrapper>
  );
};

export default RunnerTimeline;
