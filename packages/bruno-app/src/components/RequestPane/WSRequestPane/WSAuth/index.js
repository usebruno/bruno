import React, { useEffect } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import BearerAuth from '../../Auth/BearerAuth';
import BasicAuth from '../../Auth/BasicAuth';
import ApiKeyAuth from '../../Auth/ApiKeyAuth';
import StyledWrapper from './StyledWrapper';
import { humanizeRequestAuthMode } from 'utils/collections';
import { getTreePathFromCollectionToItem } from 'utils/collections/index';
import { updateRequestAuthMode, updateAuth } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTranslation } from 'react-i18next';

const supportedAuthModes = ['basic', 'bearer', 'apikey', 'oauth2', 'none', 'inherit'];

const WSAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);

  const request = item.draft
    ? get(item, 'draft.request', {})
    : get(item, 'request', {});

  const save = () => {
    return saveRequest(item.uid, collection.uid);
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
        return <div>{t('REQUEST_AUTH.NO_AUTH')}</div>;
      }
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
        return (
          <>
            <div className="flex flex-row w-full gap-2">
              <div>
                {t('REQUEST_AUTH.OAUTH2_NOT_SUPPORTED_WS')}
              </div>
            </div>
          </>
        );
      }
      case 'inherit': {
        const source = getEffectiveAuthSource();

        // Check if inherited auth is OAuth1/OAuth2 - not supported for WebSockets
        if (source?.auth?.mode === 'oauth1' || source?.auth?.mode === 'oauth2') {
          return (
            <>
              <div className="flex flex-row w-full mt-2 gap-2">
                {t('REQUEST_AUTH.OAUTH_NOT_SUPPORTED_WS', { version: source.auth.mode === 'oauth1' ? '1.0' : '2' })}
              </div>
            </>
          );
        }

        // Only show inherited auth if it's one of the supported types
        if (source && supportedAuthModes.includes(source.auth?.mode)) {
          return (
            <>
              <div className="flex flex-row w-full gap-2">
                <div> {t('REQUEST_AUTH.AUTH_INHERITED_FROM', { name: source.name })}: </div>
                <div className="inherit-mode-text">{humanizeRequestAuthMode(source.auth?.mode, t)}</div>
              </div>
            </>
          );
        } else {
          return (
            <>
              <div className="flex flex-row w-full gap-2">
                <div>{t('REQUEST_AUTH.INHERITED_AUTH_NOT_SUPPORTED_WS')}</div>
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
    <StyledWrapper className="w-full overflow-y-scroll">
      {getAuthView()}
    </StyledWrapper>
  );
};

export default WSAuth;
