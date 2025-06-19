import React from 'react';
import forOwn from 'lodash/forOwn';
import StyledWrapper from './StyledWrapper';
import TimelineItem from '../Timeline/TimelineItem';

const RunnerTimeline = ({ request, response, item, collection, width }) => {
  const requestHeaders = [];

  request = request || {};
  response = response || {};

  forOwn(request.headers, (value, key) => {
    requestHeaders.push({
      name: key,
      value
    });
  });

  return (
    <StyledWrapper className="pb-4 w-full">
      <TimelineItem
        request={request}
        response={response}
        item={item}
        collection={collection}
        width={width}
        hideTimestamp={true}
      />
    </StyledWrapper>
  );
};

export default RunnerTimeline;
