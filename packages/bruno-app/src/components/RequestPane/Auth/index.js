import React from 'react';
import get from 'lodash/get';
import AuthMode from './AuthMode';
import AwsV4Auth from './AwsV4Auth';
import BearerAuth from './BearerAuth';
import BasicAuth from './BasicAuth';
import DigestAuth from './DigestAuth';
import WsseAuth from './WsseAuth';
import NTLMAuth from './NTLMAuth';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';

import ApiKeyAuth from './ApiKeyAuth';
import StyledWrapper from './StyledWrapper';
import { humanizeRequestAuthMode } from 'utils/collections';
import OAuth2 from './OAuth2/index';
import { findItemInCollection, findParentItemInCollection } from 'utils/collections/index';

const getTreePathFromCollectionToItem = (collection, _item) => {
  let path = [];
  let item = findItemInCollection(collection, _item?.uid);
  while (item) {
    path.unshift(item);
    item = findParentItemInCollection(collection, item?.uid);
  }
  return path;
};

const Auth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  
  // Create a request object to pass to the auth components
  const request = item.draft 
    ? get(item, 'draft.request', {})
    : get(item, 'request', {});

  // Save function for request level
  const save = () => {
    return dispatch(saveRequest(item.uid, collection.uid));
  };

  const getEffectiveAuthSource = () => {
    if (authMode !== 'inherit') return null;

    const collectionRoot = collection?.draft || collection?.root || {};
    const collectionAuth = get(collectionRoot, 'request.auth');
    let effectiveSource = {
      type: 'collection',
      name: 'Collection',
      auth: collectionAuth
    };

    // Check folders in reverse to find the closest auth configuration
    for (let i of [...requestTreePath].reverse()) {
      if (i.type === 'folder') {
        const folderAuth = get(i, 'root.request.auth');
        if (folderAuth && folderAuth.mode && folderAuth.mode !== 'inherit') {
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
      case 'awsv4': {
        return <AwsV4Auth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'basic': {
        return <BasicAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'bearer': {
        return <BearerAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'digest': {
        return <DigestAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'ntlm': {
        return <NTLMAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }      
      case 'oauth2': {
        return <OAuth2 collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'wsse': {
        return <WsseAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'apikey': {
        return <ApiKeyAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'inherit': {
        const source = getEffectiveAuthSource();
        return (
          <>
            <div className="flex flex-row w-full mt-2 gap-2">
              <div>Auth inherited from {source.name}: </div>
              <div className="inherit-mode-text">{humanizeRequestAuthMode(source.auth?.mode)}</div>
            </div>
          </>
        );
      }
    }
  };

  return (
    <StyledWrapper className="w-full mt-1 overflow-auto">
      <div className="flex flex-grow justify-start items-center">
        <AuthMode item={item} collection={collection} />
      </div>
      {getAuthView()}
    </StyledWrapper>
  );
};

export default Auth;
