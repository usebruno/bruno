import React, { useEffect, useMemo } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import WSAuthMode from './WSAuthMode';
import BearerAuth from '../../Auth/BearerAuth';
import BasicAuth from '../../Auth/BasicAuth';
import ApiKeyAuth from '../../Auth/ApiKeyAuth';
import StyledWrapper from './StyledWrapper';
import InheritedAuth, { InheritedAuthSourceLabel } from '../../Auth/InheritedAuth';
import { getEffectiveAuthSource } from 'utils/auth';
import { updateRequestAuthMode, updateAuth } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';

import { AUTH_MODES, AUTH_MODES_WS } from 'utils/common/constants';

const WS_INHERITED_AUTH_MODES = AUTH_MODES_WS.filter((mode) => mode !== AUTH_MODES.OAUTH2);

const getWsInheritedUnsupportedMessage = (inheritedSource) => {
  const inheritedMode = inheritedSource?.auth?.mode;
  if (inheritedMode === AUTH_MODES.OAUTH1) {
    return 'OAuth 1.0 not yet supported by WebSockets. Using no auth instead.';
  }
  if (inheritedMode === AUTH_MODES.OAUTH2) {
    return 'OAuth 2 not yet supported by WebSockets. Using no auth instead.';
  }
  return 'Inherited auth not supported by WebSockets. Using no auth instead.';
};

const WSAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const request = item.draft
    ? get(item, 'draft.request', {})
    : get(item, 'request', {});

  const save = () => {
    return saveRequest(item.uid, collection.uid);
  };

  const inheritedSource = useMemo(
    () => (authMode === 'inherit' ? getEffectiveAuthSource(collection, item) : null),
    [authMode, item, collection]
  );

  // Reset to 'none' if current auth mode is not supported
  useEffect(() => {
    if (authMode && !AUTH_MODES_WS.includes(authMode)) {
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
        return (
          <InheritedAuth
            collection={collection}
            item={item}
            inheritedSource={inheritedSource}
            supportedModes={WS_INHERITED_AUTH_MODES}
          />
        );
      }
      default: {
        return null;
      }
    }
  };

  return (
    <StyledWrapper className="w-full overflow-y-scroll">
      <div className="flex items-center justify-between gap-2 mb-4 min-w-0">
        <WSAuthMode item={item} collection={collection} />
        {authMode === 'inherit' && inheritedSource ? (
          <InheritedAuthSourceLabel
            collection={collection}
            inheritedSource={inheritedSource}
            supportedModes={WS_INHERITED_AUTH_MODES}
            unsupportedMessage={getWsInheritedUnsupportedMessage(inheritedSource)}
          />
        ) : null}
      </div>
      {getAuthView()}
    </StyledWrapper>
  );
};

export default WSAuth;
