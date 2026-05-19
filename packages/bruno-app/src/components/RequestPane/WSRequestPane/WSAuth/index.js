import React, { useEffect } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import BearerAuth from '../../Auth/BearerAuth';
import BasicAuth from '../../Auth/BasicAuth';
import ApiKeyAuth from '../../Auth/ApiKeyAuth';
import StyledWrapper from './StyledWrapper';
import { humanizeRequestAuthMode } from 'utils/collections';
import { getEffectiveAuthSource } from 'utils/auth';
import { updateRequestAuthMode, updateAuth } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';

import { SUPPORTED_WS_AUTH_MODES } from 'utils/common/constants';

const WSAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const request = item.draft
    ? get(item, 'draft.request', {})
    : get(item, 'request', {});

  const save = () => {
    return saveRequest(item.uid, collection.uid);
  };

  // Reset to 'none' if current auth mode is not supported
  useEffect(() => {
    if (authMode && !SUPPORTED_WS_AUTH_MODES.includes(authMode)) {
      dispatch(updateRequestAuthMode({
        itemUid: item.uid,
        collectionUid: collection.uid,
        mode: 'none'
      }));
    }
  }, [authMode, collection.uid, dispatch, item.uid]);

  const getAuthView = () => {
    switch (authMode) {
      case 'none': {
        return <div>No Auth</div>;
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
                OAuth 2 not <strong>yet</strong> supported by WebSockets. Using no auth instead.
              </div>
            </div>
          </>
        );
      }
      case 'inherit': {
        const source = getEffectiveAuthSource(collection, item);

        // Check if inherited auth is OAuth1/OAuth2 - not supported for WebSockets
        if (source?.auth?.mode === 'oauth1' || source?.auth?.mode === 'oauth2') {
          return (
            <>
              <div className="flex flex-row w-full mt-2 gap-2">
                {source.auth.mode === 'oauth1' ? 'OAuth 1.0' : 'OAuth 2'} not <strong>yet</strong> supported by WebSockets. Using no auth instead.
              </div>
            </>
          );
        }

        // Only show inherited auth if it's one of the supported types
        if (source && SUPPORTED_WS_AUTH_MODES.includes(source.auth?.mode)) {
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
                <div>Inherited auth not supported by WebSockets. Using no auth instead.</div>
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
