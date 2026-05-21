import React, { useEffect, useMemo, useRef, useState } from 'react';
import StyledWrapper from './StyledWrapper';
import { findItemInCollection, findParentItemInCollection } from 'utils/collections/index';
import { get } from 'lodash';
import TimelineItem from './TimelineItem/index';
import GrpcTimelineItem from './GrpcTimelineItem/index';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import { buildTimelineEntries, getEntryKind, countByKind } from './buildEntries';
import { FILTER_CHIPS } from './entryMeta';

const getEffectiveAuthSource = (collection, item) => {
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');
  if (authMode !== 'inherit') return null;

  const collectionRoot = collection?.draft?.root || collection?.root || {};
  const collectionAuth = get(collectionRoot, 'request.auth');
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

const Timeline = ({ collection, item }) => {
  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `response-timeline-scroll-${item.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: null, onChange: setScroll, initialValue: scroll });
  const [activeFilter, setActiveFilter] = useState('all');

  const authSource = getEffectiveAuthSource(collection, item);
  const isGrpcRequest = item.type === 'grpc-request' || item.type === 'ws-request';

  const entries = useMemo(
    () => buildTimelineEntries(collection?.timeline, item.uid, authSource),
    [collection?.timeline, item.uid, authSource]
  );
  const counts = useMemo(() => countByKind(entries), [entries]);

  const visibleChips = FILTER_CHIPS.filter((chip) => chip.id === 'all' || counts[chip.id] > 0);
  const hasOtherKinds = counts.pre > 0 || counts.post > 0 || counts.oauth > 0;
  const showFilterBar = entries.length > 0 && hasOtherKinds;

  useEffect(() => {
    if (activeFilter === 'all') return;
    const stillVisible = visibleChips.some((chip) => chip.id === activeFilter);
    if (!stillVisible) setActiveFilter('all');
  }, [activeFilter, visibleChips]);

  return (
    <StyledWrapper
      className="pb-4 w-full flex flex-grow flex-col"
      ref={wrapperRef}
    >
      {showFilterBar && (
        <div className="timeline-filter-bar">
          {visibleChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`timeline-chip ${activeFilter === chip.id ? 'is-active' : ''}`}
              onClick={() => setActiveFilter(chip.id)}
            >
              {chip.label}
              <span className="timeline-chip-count">{counts[chip.id] ?? 0}</span>
            </button>
          ))}
        </div>
      )}

      <div className="timeline-container">
        {entries.map((entry, index) => {
          const kind = getEntryKind(entry);
          if (activeFilter !== 'all' && activeFilter !== kind) return null;

          if (entry.type === 'request') {
            const { data, timestamp, eventType } = entry;
            const { request, response, eventData = {}, timestamp: eventTimestamp = timestamp } = data;

            if (isGrpcRequest) {
              return (
                <div key={index} className="timeline-event">
                  <GrpcTimelineItem
                    timestamp={eventTimestamp}
                    request={request}
                    response={response}
                    eventType={eventType}
                    eventData={eventData}
                    item={item}
                    collection={collection}
                  />
                </div>
              );
            }

            return (
              <div key={index} className="timeline-event">
                <TimelineItem
                  timestamp={timestamp}
                  request={request}
                  response={response}
                  item={item}
                  collection={collection}
                  source="main"
                />
              </div>
            );
          }

          if (entry.type === 'oauth2' && entry._oauth2Child) {
            return (
              <div key={index} className="timeline-event">
                <TimelineItem
                  timestamp={entry.timestamp}
                  request={entry._oauth2Child.request}
                  response={entry._oauth2Child.response}
                  item={item}
                  collection={collection}
                  source="oauth2.0"
                  isOauth2={true}
                />
              </div>
            );
          }

          if (entry.type === 'scripted-request') {
            return (
              <div key={index} className="timeline-event">
                <TimelineItem
                  timestamp={entry.timestamp}
                  request={entry.data?.request}
                  response={entry.data?.response}
                  item={item}
                  collection={collection}
                  source={entry.source || 'sendRequest'}
                  scope={entry.scope}
                  phase={entry.phase}
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </StyledWrapper>
  );
};

export default Timeline;
