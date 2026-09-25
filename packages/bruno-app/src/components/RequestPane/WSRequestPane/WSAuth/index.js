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

import { AUTH_MODES, AUTH_MODES_WS } from 'utils/common/constants';

const WS_INHERITED_AUTH_MODES = AUTH_MODES_WS.filter((mode) => mode !== AUTH_MODES.OAUTH2);

const WSAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const request = item.draft
    ? get(item, 'draft.request', {})
    : get(item, 'request', {});

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
        return <BasicAuth collection={collection} item={item} updateAuth={updateAuth} request={request} />;
      }
      case 'bearer': {
        return <BearerAuth collection={collection} item={item} updateAuth={updateAuth} request={request} />;
      }
      case 'apikey': {
        return <ApiKeyAuth collection={collection} item={item} updateAuth={updateAuth} request={request} />;
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
      <div className="flex flex-col items-start gap-2 mb-4 min-w-0">
        <WSAuthMode item={item} collection={collection} />
        {authMode === 'inherit' && inheritedSource ? (
          <InheritedAuthSourceLabel
            collection={collection}
            inheritedSource={inheritedSource}
            supportedModes={WS_INHERITED_AUTH_MODES}
            protocolLabel="WebSockets"
          />
        ) : null}
      </div>
      {getAuthView()}
    </StyledWrapper>
  );
};

export default WSAuth;
