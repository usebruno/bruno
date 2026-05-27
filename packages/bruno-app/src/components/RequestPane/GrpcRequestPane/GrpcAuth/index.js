import React, { useEffect, useMemo } from 'react';
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
import { getEffectiveAuthSource } from 'utils/auth';
import { updateRequestAuthMode, updateAuth } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';

import { AUTH_MODES_GRPC } from 'utils/common/constants';

const GrpcAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const request = item.draft
    ? get(item, 'draft.request', {})
    : get(item, 'request', {});

  const inheritedSource = useMemo(
    () => (authMode === 'inherit' ? getEffectiveAuthSource(collection, item) : null),
    [authMode, item.uid, collection.uid]
  );

  const save = () => {
    return saveRequest(item.uid, collection.uid);
  };

  // Reset to 'none' if current auth mode is not supported by gRPC
  useEffect(() => {
    if (authMode && !AUTH_MODES_GRPC.includes(authMode)) {
      dispatch(
        updateRequestAuthMode({
          itemUid: item.uid,
          collectionUid: collection.uid,
          mode: 'none'
        })
      );
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
        return <OAuth2 collection={collection} item={item} updateAuth={updateAuth} request={request} save={save} />;
      }
      case 'wsse': {
        return <WsseAuth collection={collection} item={item} updateAuth={updateAuth} request={request} save={save} />;
      }
      case 'inherit': {
        // Only show inherited auth if it's one of the supported types
        if (inheritedSource && AUTH_MODES_GRPC.includes(inheritedSource.auth?.mode)) {
          return (
            <>
              <div className="flex flex-row w-full gap-2">
                <div>Auth inherited from {inheritedSource.name}: </div>
                <div className="inherit-mode-text">{humanizeRequestAuthMode(inheritedSource.auth?.mode)}</div>
              </div>
            </>
          );
        } else {
          return (
            <>
              <div className="flex flex-row w-full gap-2">
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
    <StyledWrapper className="w-full overflow-y-scroll">
      {getAuthView()}
    </StyledWrapper>
  );
};

export default GrpcAuth;
