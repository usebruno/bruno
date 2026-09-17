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
  switch (authMode) {
    case 'none': {
      return <div className="mt-2">No Auth</div>;
    }
    case 'awsv4': {
      return <AwsV4Auth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} disabled={disabled} />;
    }
    case 'basic': {
      return <BasicAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} disabled={disabled} />;
    }
    case 'bearer': {
      return <BearerAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} disabled={disabled} />;
    }
    case 'digest': {
      return <DigestAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} disabled={disabled} />;
    }
    case 'ntlm': {
      return <NTLMAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} disabled={disabled} />;
    }
    case 'oauth1': {
      return <OAuth1 collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} disabled={disabled} />;
    }
    case 'oauth2': {
      return <OAuth2 collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} disabled={disabled} />;
    }
    case 'wsse': {
      return <WsseAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} disabled={disabled} />;
    }
    case 'apikey': {
      return <ApiKeyAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} disabled={disabled} />;
    }
    case 'akamai-edgegrid': {
      return <EdgeGridAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} disabled={disabled} />;
    }
    default: {
      return null;
    }
  }
};

export default AuthFields;
