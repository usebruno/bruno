import React from 'react';
import get from 'lodash/get';
import AuthMode from './AuthMode';
import AwsV4Auth from './AwsV4Auth';
import BearerAuth from './BearerAuth';
import BasicAuth from './BasicAuth';
import DigestAuth from './DigestAuth';
import WsseAuth from './WsseAuth';
import ApiKeyAuth from './ApiKeyAuth';
import StyledWrapper from './StyledWrapper';
import { humanizeRequestAuthMode } from 'utils/collections/index';
import OAuth2 from './OAuth2/index';

const Auth = ({ item, collection }) => {
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const collectionRoot = get(collection, 'root', {});
  const collectionAuth = get(collectionRoot, 'request.auth');

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
        return (
          <div className="flex flex-row w-full mt-2 gap-2">
            {collectionAuth?.mode === 'oauth2' ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-1">
                  <div>Collection level auth is: </div>
                  <div className="inherit-mode-text">{humanizeRequestAuthMode(collectionAuth?.mode)}</div>
                </div>
                <div className="text-sm opacity-50">
                  Note: You need to use scripting to set the access token in the request headers.
                </div>
              </div>
            ) : (
              <>
                <div>Auth inherited from the Collection: </div>
                <div className="inherit-mode-text">{humanizeRequestAuthMode(collectionAuth?.mode)}</div>
              </>
            )}
          </div>
        );
      }
    }
  };

  return (
    <StyledWrapper className="w-full mt-1">
      <div className="flex flex-grow justify-start items-center">
        <AuthMode item={item} collection={collection} />
      </div>
      {getAuthView()}
    </StyledWrapper>
  );
};

export default Auth;
