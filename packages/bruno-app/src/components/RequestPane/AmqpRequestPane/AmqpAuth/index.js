import React, { useEffect } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import BasicAuth from '../../Auth/BasicAuth';
import StyledWrapper from './StyledWrapper';
import { humanizeRequestAuthMode } from 'utils/collections';
import { getTreePathFromCollectionToItem } from 'utils/collections/index';
import { updateRequestAuthMode, updateAuth } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';

const supportedAuthModes = ['basic', 'none', 'inherit'];

const AmqpAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);

  const request = item.draft
    ? get(item, 'draft.request', {})
    : get(item, 'request', {});

  const save = () => {
    return dispatch(saveRequest(item.uid, collection.uid));
  };

  // Reset to 'none' if current auth mode is not supported
  useEffect(() => {
    if (authMode && !supportedAuthModes.includes(authMode)) {
      dispatch(updateRequestAuthMode({
        itemUid: item.uid,
        collectionUid: collection.uid,
        mode: 'none'
      }));
    }
  }, [authMode, collection.uid, dispatch, item.uid]);

  const getEffectiveAuthSource = () => {
    if (authMode !== 'inherit') return null;

    const collectionRoot = collection?.draft?.root || collection?.root || {};
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
      case 'none': {
        return <div>No Auth</div>;
      }
      case 'basic': {
        return <BasicAuth collection={collection} item={item} updateAuth={updateAuth} request={request} save={save} />;
      }
      case 'inherit': {
        const source = getEffectiveAuthSource();

        // Only show inherited auth if it's one of the supported types
        if (source && supportedAuthModes.includes(source.auth?.mode)) {
          return (
            <>
              <div className="flex flex-row w-full gap-2">
                <div> Auth inherited from {source.name}: </div>
                <div className="inherit-mode-text">{humanizeRequestAuthMode(source.auth?.mode)}</div>
              </div>
            </>
          );
        } else {
          return (
            <>
              <div className="flex flex-row w-full gap-2">
                <div>Inherited auth not supported by AMQP. Using no auth instead.</div>
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
    <StyledWrapper className="w-full px-4 overflow-y-scroll">
      {getAuthView()}
    </StyledWrapper>
  );
};

export default AmqpAuth;
