import React from 'react';
import AwsV4Auth from '../AwsV4Auth';
import BearerAuth from '../BearerAuth';
import BasicAuth from '../BasicAuth';
import DigestAuth from '../DigestAuth';
import WsseAuth from '../WsseAuth';
import NTLMAuth from '../NTLMAuth';
import OAuth1 from '../OAuth1';
import ApiKeyAuth from '../ApiKeyAuth';
import EdgeGridAuth from '../EdgeGridAuth';
import OAuth2 from '../OAuth2/index';

const AuthFields = ({ authMode, collection, item, request, save, updateAuth, disabled }) => {
  const authProps = { collection, item, request, save, updateAuth, disabled };

  switch (authMode) {
    case 'none': {
      return <div className="mt-2">No Auth</div>;
    }
    case 'awsv4': {
      return <AwsV4Auth {...authProps} />;
    }
    case 'basic': {
      return <BasicAuth {...authProps} />;
    }
    case 'bearer': {
      return <BearerAuth {...authProps} />;
    }
    case 'digest': {
      return <DigestAuth {...authProps} />;
    }
    case 'ntlm': {
      return <NTLMAuth {...authProps} />;
    }
    case 'oauth1': {
      return <OAuth1 {...authProps} />;
    }
    case 'oauth2': {
      return <OAuth2 {...authProps} />;
    }
    case 'wsse': {
      return <WsseAuth {...authProps} />;
    }
    case 'apikey': {
      return <ApiKeyAuth {...authProps} />;
    }
    case 'akamai-edgegrid': {
      return <EdgeGridAuth {...authProps} />;
    }
    default: {
      return null;
    }
  }
};

export default AuthFields;
