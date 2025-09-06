import React, { useEffect } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import GrpcAuthMode from './GrpcAuthMode';
import BearerAuth from '../../Auth/BearerAuth';
import BasicAuth from '../../Auth/BasicAuth';
import ApiKeyAuth from '../../Auth/ApiKeyAuth';
import OAuth2 from '../../Auth/OAuth2/index';
import WsseAuth from '../../Auth/WsseAuth';
import StyledWrapper from './StyledWrapper';
import { humanizeRequestAuthMode } from 'utils/collections';
import { getTreePathFromCollectionToItem } from 'utils/collections/index';
import { updateRequestAuthMode, updateAuth } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';

// List of auth modes supported by gRPC
// Note: Only header-based auth modes work with gRPC
// Complex auth modes like AWS Sig v4, Digest, and NTLM require axios interceptors
// and cannot be supported in gRPC requests as of now
const supportedGrpcAuthModes = ['basic', 'bearer', 'apikey', 'oauth2', 'wsse', 'none', 'inherit'];

const GrpcAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);

  const request = item.draft 
    ? get(item, 'draft.request', {})
    : get(item, 'request', {});

  const save = () => {
    return saveRequest(item.uid, collection.uid);
  };

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
        return <BasicAuth collection={collection} item={item} updateAuth={updateAuth} request={request} save={save} />;
      }
      case 'bearer': {
        return <BearerAuth collection={collection} item={item} updateAuth={updateAuth} request={request} save={save} />;
      }
      case 'apikey': {
        return <ApiKeyAuth collection={collection} item={item} updateAuth={updateAuth} request={request} save={save} />;
      }
      case 'oauth2': {
        return <OAuth2 collection={collection} item={item} updateAuth={updateAuth} request={request} save={save} />;
      }
      case 'wsse': {
        return <WsseAuth collection={collection} item={item} updateAuth={updateAuth} request={request} save={save} />;
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