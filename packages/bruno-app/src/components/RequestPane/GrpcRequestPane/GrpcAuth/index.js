import React, { useEffect } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import GrpcAuthMode from './GrpcAuthMode';
import BearerAuth from '../../Auth/BearerAuth';
import BasicAuth from '../../Auth/BasicAuth';
import ApiKeyAuth from '../../Auth/ApiKeyAuth';
import StyledWrapper from '../../Auth/StyledWrapper';
import { humanizeRequestAuthMode } from 'utils/collections';
import { findItemInCollection, findParentItemInCollection } from 'utils/collections/index';
import { updateRequestAuthMode } from 'providers/ReduxStore/slices/collections';

const getTreePathFromCollectionToItem = (collection, _item) => {
  let path = [];
  let item = findItemInCollection(collection, _item?.uid);
  while (item) {
    path.unshift(item);
    item = findParentItemInCollection(collection, item?.uid);
  }
  return path;
};

// List of auth modes supported by gRPC
const supportedGrpcAuthModes = ['basic', 'bearer', 'apikey', 'none', 'inherit'];

const GrpcAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);

  // Reset to 'none' if current auth mode is not supported by gRPC
  useEffect(() => {
    if (authMode && !supportedGrpcAuthModes.includes(authMode)) {
      dispatch(
        updateRequestAuthMode({
          itemUid: item.uid,
          collectionUid: collection.uid,
          mode: 'none'
        })
      );
    }
  }, [authMode, collection.uid, dispatch, item.uid]);

  const getEffectiveAuthSource = () => {
    if (authMode !== 'inherit') return null;

    const collectionAuth = get(collection, 'root.request.auth');
    let effectiveSource = {
      type: 'collection',
      name: 'Collection',
      auth: collectionAuth
    };

    // Check folders in reverse to find the closest auth configuration
    for (let i of [...requestTreePath].reverse()) {
      if (i.type === 'folder') {
        const folderAuth = get(i, 'root.request.auth');
        if (folderAuth && folderAuth.mode && folderAuth.mode !== 'none' && folderAuth.mode !== 'inherit') {
          effectiveSource = {
            type: 'folder',
            name: i.name,
            auth: folderAuth
          };
          break;
        }
      }
    }

    return effectiveSource;
  };

  const getAuthView = () => {
    switch (authMode) {
      case 'basic': {
        return <BasicAuth collection={collection} item={item} />;
      }
      case 'bearer': {
        return <BearerAuth collection={collection} item={item} />;
      }
      case 'apikey': {
        return <ApiKeyAuth collection={collection} item={item} />;
      }
      case 'inherit': {
        const source = getEffectiveAuthSource();
        
        // Only show inherited auth if it's one of the supported types
        if (source && supportedGrpcAuthModes.includes(source.auth?.mode)) {
          return (
            <>
              <div className="flex flex-row w-full mt-2 gap-2">
                <div>Auth inherited from {source.name}: </div>
                <div className="inherit-mode-text">{humanizeRequestAuthMode(source.auth?.mode)}</div>
              </div>
            </>
          );
        } else {
          return (
            <>
              <div className="flex flex-row w-full mt-2 gap-2">
                <div>Inherited auth not supported by gRPC. Using no auth instead.</div>
              </div>
            </>
          );
        }
      }
      default: {
        return null;
      }
    }
  };

  return (
    <StyledWrapper className="w-full mt-1 overflow-y-scroll">
      <div className="flex flex-grow justify-start items-center">
        <GrpcAuthMode item={item} collection={collection} />
      </div>
      {getAuthView()}
    </StyledWrapper>
  );
};

export default GrpcAuth; 