import React, { useMemo } from 'react';
import StyledWrapper from './StyledWrapper';
import TimelineItem from '../Timeline/TimelineItem';

const RunnerTimeline = ({ request = {}, response = {}, item, collection }) => {
  // Build a single newest-first list — main, oauth sub-calls, and scripted
  // entries together — matching how the regular Timeline orders them.
  // The Runner stores main in runnerResult (not collection.timeline), so we
  // synthesize a main entry from props and merge it with the timeline entries.
  const entries = useMemo(() => {
    const timeline = collection?.timeline?.filter((e) => e.itemUid === item.uid) || [];

    const mainTimestamp = request?.timestamp ?? response?.timestamp ?? Date.now();

    // Anchor oauth sub-calls just below main (newest-first within the group).
    // The regular Timeline does the same via expandOauthEntry — here we can do
    // it directly since main isn't in collection.timeline for the Runner.
    const oauth = timeline
      .filter((e) => e.type === 'oauth2')
      .flatMap((event) => {
        const debugInfo = event.data?.debugInfo || [];
        return [...debugInfo].reverse().map((sub, i) => ({
          kind: 'oauth2',
          timestamp: mainTimestamp - 1 - i,
          request: sub?.request,
          response: sub?.response
        }));
      });

    const scripted = timeline
      .filter((e) => e.type === 'scripted-request')
      .map((e) => ({
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
  }, [collection?.timeline, item.uid, request, response]);

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
