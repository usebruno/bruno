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
import InheritedAuth, { InheritedAuthSourceLabel } from '../../Auth/InheritedAuth';
import { getEffectiveAuthSource } from 'utils/auth';
import { updateRequestAuthMode, updateAuth } from 'providers/ReduxStore/slices/collections';

import { AUTH_MODES_GRPC } from 'utils/common/constants';

const GrpcAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const request = item.draft
    ? get(item, 'draft.request', {})
    : get(item, 'request', {});

  const inheritedSource = useMemo(
    () => (authMode === 'inherit' ? getEffectiveAuthSource(collection, item) : null),
    [authMode, item, collection]
  );

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
        return <BasicAuth collection={collection} item={item} updateAuth={updateAuth} request={request} />;
      }
      case 'bearer': {
        return <BearerAuth collection={collection} item={item} updateAuth={updateAuth} request={request} />;
      }
      case 'apikey': {
        return <ApiKeyAuth collection={collection} item={item} updateAuth={updateAuth} request={request} />;
      }
      case 'oauth2': {
        return <OAuth2 collection={collection} item={item} updateAuth={updateAuth} request={request} />;
      }
      case 'wsse': {
        return <WsseAuth collection={collection} item={item} updateAuth={updateAuth} request={request} />;
      }
      case 'inherit': {
        return (
          <InheritedAuth
            collection={collection}
            item={item}
            inheritedSource={inheritedSource}
            supportedModes={AUTH_MODES_GRPC}
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
        <GrpcAuthMode item={item} collection={collection} />
        {authMode === 'inherit' && inheritedSource ? (
          <InheritedAuthSourceLabel
            collection={collection}
            inheritedSource={inheritedSource}
            supportedModes={AUTH_MODES_GRPC}
            protocolLabel="gRPC"
          />
        ) : null}
      </div>
      {getAuthView()}
    </StyledWrapper>
  );
};

export default GrpcAuth;
