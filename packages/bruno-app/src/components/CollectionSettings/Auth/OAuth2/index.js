import React from 'react';
import get from 'lodash/get';
import StyledWrapper from './StyledWrapper';
import { saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import OAuth2AuthorizationCode from 'components/RequestPane/Auth/OAuth2/AuthorizationCode/index';
import { updateCollectionAuth } from 'providers/ReduxStore/slices/collections/index';
import { useDispatch } from 'react-redux';
import OAuth2PasswordCredentials from 'components/RequestPane/Auth/OAuth2/PasswordCredentials/index';
import OAuth2ClientCredentials from 'components/RequestPane/Auth/OAuth2/ClientCredentials/index';
import GrantTypeSelector from 'components/RequestPane/Auth/OAuth2/GrantTypeSelector/index';

const GrantTypeComponentMap = ({collection }) => {
  const dispatch = useDispatch();

  const save = () => {
    dispatch(saveCollectionRoot(collection.uid));
  };

  let request = collection.draft ? get(collection, 'draft.request', {}) : get(collection, 'root.request', {});
  const grantType = get(request, 'auth.oauth2.grantType', {});

  switch (grantType) {
    case 'password':
      return <OAuth2PasswordCredentials save={save} request={request} updateAuth={updateCollectionAuth} collection={collection} />;
      break;
    case 'authorization_code':
      return <OAuth2AuthorizationCode save={save} request={request} updateAuth={updateCollectionAuth} collection={collection} />;
      break;
    case 'client_credentials':
      return <OAuth2ClientCredentials save={save} request={request} updateAuth={updateCollectionAuth} collection={collection} />;
      break;
    default:
      return <div>TBD</div>;
      break;
  }
};

const OAuth2 = ({ collection }) => {
  let request = collection.draft ? get(collection, 'draft.request', {}) : get(collection, 'root.request', {});

  return (
    <StyledWrapper className="mt-2 w-full">
      <GrantTypeSelector request={request} updateAuth={updateCollectionAuth} collection={collection} />
      <GrantTypeComponentMap collection={collection} />
    </StyledWrapper>
  );
};

export default OAuth2;
