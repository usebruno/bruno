import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import AuthMode from './AuthMode';
import AwsV4Auth from './AwsV4Auth';
import BearerAuth from './BearerAuth';
import BasicAuth from './BasicAuth';
import DigestAuth from './DigestAuth';
import WsseAuth from './WsseAuth';
import ApiKeyAuth from './ApiKeyAuth/';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import OAuth2 from './OAuth2';
import NTLMAuth from './NTLMAuth';
import OAuth1 from './Oauth1';
import Button from 'ui/Button';

const Auth = ({ collection }) => {
  const authMode = collection.draft?.root ? get(collection, 'draft.root.request.auth.mode') : get(collection, 'root.request.auth.mode');
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  const getAuthView = () => {
    switch (authMode) {
      case 'awsv4': {
        return <AwsV4Auth collection={collection} />;
      }
      case 'basic': {
        return <BasicAuth collection={collection} />;
      }
      case 'bearer': {
        return <BearerAuth collection={collection} />;
      }
      case 'digest': {
        return <DigestAuth collection={collection} />;
      }
      case 'ntlm': {
        return <NTLMAuth collection={collection} />;
      }
      case 'oauth1': {
        return <OAuth1 collection={collection} />;
      }
      case 'oauth2': {
        return <OAuth2 collection={collection} />;
      }
      case 'wsse': {
        return <WsseAuth collection={collection} />;
      }
      case 'apikey': {
        return <ApiKeyAuth collection={collection} />;
      }
    }
  };

  return (
    <StyledWrapper className="w-full h-full">
      <div className="text-xs mb-4 text-muted">
        {t('COLLECTION_AUTH.DESCRIPTION')}
      </div>
      <div className="flex flex-grow justify-start items-center">
        <AuthMode collection={collection} />
      </div>
      {getAuthView()}
      <div className="mt-6">
        <Button type="submit" size="sm" onClick={handleSave}>
          {t('COLLECTION_AUTH.SAVE')}
        </Button>
      </div>
    </StyledWrapper>
  );
};
export default Auth;
