import React from 'react';
import get from 'lodash/get';
import StyledWrapper from './StyledWrapper';
import GrantTypeSelector from './GrantTypeSelector/index';
import OAuth2PasswordCredentials from './PasswordCredentials/index';
import OAuth2AuthorizationCode from './AuthorizationCode/index';
import OAuth2ClientCredentials from './ClientCredentials/index';

const grantTypeComponentMap = (grantType, collection) => {
  switch (grantType) {
    case 'password':
      return <OAuth2PasswordCredentials collection={collection} />;
      break;
    case 'authorization_code':
      return <OAuth2AuthorizationCode collection={collection} />;
      break;
    case 'client_credentials':
      return <OAuth2ClientCredentials collection={collection} />;
      break;
    default:
      return <div>TBD</div>;
      break;
  }
};

const OAuth2 = ({ collection }) => {
  const oAuth = collection.draft ? get(collection, 'draft.request.auth.oauth2', {}) : get(collection, 'root.request.auth.oauth2', {});

  return (
    <StyledWrapper className="mt-2 w-full">
      <GrantTypeSelector collection={collection} />
      {grantTypeComponentMap(oAuth?.grantType, collection)}
    </StyledWrapper>
  );
};

export default OAuth2;
