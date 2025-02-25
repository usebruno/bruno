import React from 'react';
import get from 'lodash/get';
import AuthMode from './AuthMode';
import AwsV4Auth from './AwsV4Auth';
import BearerAuth from './BearerAuth';
import BasicAuth from './BasicAuth';
import DigestAuth from './DigestAuth';
import WsseAuth from './WsseAuth';
import NTLMAuth from './NTLMAuth';

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
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);

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
      case 'awsv4': {
        return <AwsV4Auth collection={collection} item={item} />;
      }
      case 'basic': {
        return <BasicAuth collection={collection} item={item} />;
      }
      case 'bearer': {
        return <BearerAuth collection={collection} item={item} />;
      }
      case 'digest': {
        return <DigestAuth collection={collection} item={item} />;
      }
      case 'ntlm': {
        return <NTLMAuth collection={collection} item={item} />;
      }      
      case 'oauth2': {
        return <OAuth2 collection={collection} item={item} />;
      }
      case 'wsse': {
        return <WsseAuth collection={collection} item={item} />;
      }
      case 'apikey': {
        return <ApiKeyAuth collection={collection} item={item} />;
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
    <StyledWrapper className="w-full mt-1 overflow-y-scroll">
      <div className="flex flex-grow justify-start items-center">
        <AuthMode item={item} collection={collection} />
      </div>
      {getAuthView()}
    </StyledWrapper>
  );
};

export default Auth;
