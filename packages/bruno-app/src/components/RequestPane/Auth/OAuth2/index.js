import React from 'react';
import get from 'lodash/get';
import StyledWrapper from './StyledWrapper';
import GrantTypeSelector from './GrantTypeSelector/index';
import OAuth2PasswordCredentials from './PasswordCredentials/index';
import OAuth2AuthorizationCode from './AuthorizationCode/index';
import OAuth2ClientCredentials from './ClientCredentials/index';
import CredentialsPreview from './CredentialsPreview';

const grantTypeComponentMap = (grantType, item, collection) => {
  switch (grantType) {
    case 'password':
      return <OAuth2PasswordCredentials item={item} collection={collection} />;
      break;
    case 'authorization_code':
      return <OAuth2AuthorizationCode item={item} collection={collection} />;
      break;
    case 'client_credentials':
      return <OAuth2ClientCredentials item={item} collection={collection} />;
      break;
    default:
      return <div>TBD</div>;
      break;
  }
};

const OAuth2 = ({ item, collection }) => {
  const oAuth = item.draft ? get(item, 'draft.request.auth.oauth2', {}) : get(item, 'request.auth.oauth2', {});

  return (
    <StyledWrapper className="mt-2 w-full">
      <GrantTypeSelector item={item} collection={collection} />
      {grantTypeComponentMap(oAuth?.grantType, item, collection)}
      <CredentialsPreview item={item} collection={collection} />
    </StyledWrapper>
  );
};

export default OAuth2;
