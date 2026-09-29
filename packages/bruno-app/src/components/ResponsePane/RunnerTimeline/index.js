import React, { useMemo } from 'react';
import StyledWrapper from './StyledWrapper';
import TimelineItem from '../Timeline/TimelineItem';

const RunnerTimeline = ({ request = {}, response = {}, item, collection }) => {
  // Reads from the runner item only, never collection.timeline, so a later
  // single-request invocation of the same item can't bleed into this view.
  const entries = useMemo(() => {
    const mainTimestamp = request?.timestamp ?? response?.timestamp ?? Date.now();

    const oauth = (item?.oauth2DebugEntries || []).flatMap((event) => {
      const debugInfo = event.debugInfo || [];
      return [...debugInfo].reverse().map((sub, i) => ({
        kind: 'oauth2',
        timestamp: mainTimestamp - 1 - i,
        request: sub?.request,
        response: sub?.response
      }));
    });

    const scripted = (item?.scriptedRequestEntries || []).map((e) => ({
      kind: 'scripted',
      timestamp: e.timestamp,
      request: e.data?.request,
      response: e.data?.response,
      source: e.source,
      scope: e.scope,
      phase: e.phase
    }));

    const main = {
      kind: 'main',
      timestamp: mainTimestamp,
      request,
      response
    };

    return [main, ...oauth, ...scripted].sort((a, b) => b.timestamp - a.timestamp);
  }, [item?.oauth2DebugEntries, item?.scriptedRequestEntries, request, response]);

  return (
    <StyledWrapper className="pb-4 w-full">
      {entries.map((entry, idx) => (
        <TimelineItem
          key={`${entry.kind}-${idx}`}
          timestamp={entry.timestamp}
          request={entry.request}
          response={entry.response}
          item={item}
          collection={collection}
          isOauth2={entry.kind === 'oauth2'}
          source={entry.kind === 'main' ? 'main' : (entry.kind === 'scripted' ? entry.source : undefined)}
          scope={entry.kind === 'scripted' ? entry.scope : undefined}
          phase={entry.kind === 'scripted' ? entry.phase : undefined}
          hideTimestamp={true}
        />
      ))}
    </StyledWrapper>
  );
};

export default RunnerTimeline;
