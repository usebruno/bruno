import React, { useState } from 'react';
import StyledWrapper from './StyledWrapper';
import { findItemInCollection, findParentItemInCollection } from 'utils/collections/index';
import { get } from 'lodash';
import TimelineItem from './TimelineItem/index';

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
        } else if (event.type === 'bru-send-request') {
          const { data, timestamp } = event;
          const { request, response, error } = data;
          return (
            <div key={index} className="timeline-event">
              <div className="timeline-event-header cursor-pointer flex items-center ml-4">
                <div className="flex items-center">
                  <span className="font-xs opacity-50">Scripting [bru.sendRequest]</span>
                  {error && <span className="ml-2 text-red-500 text-sm">[Error]</span>}
                </div>
              </div>
              <div className="mt-2">
                {request? (
                  <div className='ml-4'>
                    <TimelineItem
                      timestamp={timestamp}
                      request={request}
                      response={response}
                      item={item}
                      collection={collection}
                      width={width - 50}
                      isOauth2={false}
                    />
                  </div>
                ) : <div className="ml-4 text-gray-500">No request configuration available.</div>}
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