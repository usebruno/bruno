import React, { useMemo } from 'react';
import TimelineItem from '../Timeline/TimelineItem';
import StyledWrapper from './StyledWrapper';
import { findItemInCollection, findParentItemInCollection } from 'utils/collections';
import { get } from 'lodash';

const getEffectiveAuthSource = (collection, item) => {
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');
  if (authMode !== 'inherit') return null;

  const collectionAuth = get(collection, 'root.request.auth');
  let effectiveSource = {
    type: 'collection',
    uid: collection.uid,
    auth: collectionAuth,
  };

  // Build path from collection root to current item
  let path = [];
  let currentItem = findItemInCollection(collection, item?.uid);
  while (currentItem) {
    path.unshift(currentItem);
    currentItem = findParentItemInCollection(collection, currentItem?.uid);
  }

  // Traverse from closest folder upwards to find auth config
  for (let i of [...path].reverse()) {
    if (i.type === 'folder') {
      const folderAuth = get(i, 'root.request.auth');
      if (folderAuth && folderAuth.mode && folderAuth.mode !== 'none' && folderAuth.mode !== 'inherit') {
        effectiveSource = {
          type: 'folder',
          uid: i.uid,
          auth: folderAuth,
        };
        break;
      }
    }
  }

  return effectiveSource;
};

const RunnerTimeline = ({ request = {}, response = {}, item, collection, width }) => {
  const combinedTimeline = useMemo(() => {
    const authSource = getEffectiveAuthSource(collection, item);

    // Build primary request/response event for this runner item
    const primaryEvent = {
      type: 'request',
      itemUid: item.uid,
      timestamp:
        (response && response.timestamp) ||
        (request && request.timestamp) ||
        Date.now(),
      data: { request, response },
    };

    // Filter oauth2 events from the collection timeline respecting inherit rules
    const oauthEvents = (collection.timeline || []).filter((obj) => {
      if (obj.type !== 'oauth2' || !authSource) return false;

      if (authSource.type === 'folder') return obj.folderUid === authSource.uid;
      if (authSource.type === 'collection') return !obj.folderUid; // collection-level creds

      return false;
    });

    return [primaryEvent, ...oauthEvents].sort((a, b) => b.timestamp - a.timestamp);
  }, [collection, item, request, response]);

  return (
    <StyledWrapper
      className="pb-4 w-full flex flex-col"
      style={{ maxWidth: width - 60, overflowWrap: 'break-word' }}
    >
      {combinedTimeline.map((event, idx) => {
        if (event.type === 'request') {
          const { request: req, response: res } = event.data;
          return (
            <div key={`runner-req-${idx}`} className="timeline-event mb-2">
              <TimelineItem
                request={req}
                response={res}
                item={item}
                collection={collection}
                width={width}
                hideTimestamp={true}
              />
            </div>
          );
        }

        if (event.type === 'oauth2') {
          const { debugInfo } = event.data;
          return (
            <div key={`runner-oauth-${idx}`} className="timeline-event">
              <div className="timeline-event-header cursor-pointer flex items-center">
                <div className="flex items-center">
                  <span className="font-bold">OAuth2.0 Calls</span>
                </div>
              </div>
              <div className="mt-2">
                {debugInfo && debugInfo.length > 0 ? (
                  debugInfo.map((d, idy) => (
                    <div className="ml-4" key={idy}>
                      <TimelineItem
                        request={d?.request}
                        response={d?.response}
                        item={item}
                        collection={collection}
                        width={width - 50}
                        isOauth2={true}
                        hideTimestamp={true}
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

export default RunnerTimeline;
