import React from 'react';
import get from 'lodash/get';
import StyledWrapper from './StyledWrapper';
import GrantTypeSelector from './GrantTypeSelector/index';
import OAuth2PasswordCredentials from './PasswordCredentials/index';
import OAuth2AuthorizationCode from './AuthorizationCode/index';
import OAuth2ClientCredentials from './ClientCredentials/index';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';

const grantTypeComponentMap = (item, collection) => {
  const dispatch = useDispatch();

  const save = () => {
    dispatch(saveRequest(item.uid, collection.uid));
  };

  let request = item.draft ? get(item, 'draft.request', {}) : get(item, 'request', {});
  const grantType = get(request, 'auth.oauth2.grantType', {});

  const handleRun = async () => {
    dispatch(sendRequest(item, collection.uid));
  };


  switch (grantType) {
    case 'password':
      return <OAuth2PasswordCredentials item={item} save={save} request={request} handleRun={handleRun} updateAuth={updateAuth} collection={collection} />;
      break;
    case 'authorization_code':
      return <OAuth2AuthorizationCode item={item} save={save} request={request} handleRun={handleRun} updateAuth={updateAuth} collection={collection} />;
      break;
    case 'client_credentials':
      return <OAuth2ClientCredentials item={item} save={save} request={request} handleRun={handleRun} updateAuth={updateAuth} collection={collection} />;
      break;
    default:
      return <div>TBD</div>;
      break;
  }
};

const OAuth2 = ({ item, collection }) => {
  let request = item.draft ? get(item, 'draft.request', {}) : get(item, 'request', {});

  return (
    <StyledWrapper className="mt-2 w-full">
      <GrantTypeSelector item={item} request={request} updateAuth={updateAuth} collection={collection} />
      {grantTypeComponentMap(item, collection)}
    </StyledWrapper>
  );
};

export default OAuth2;
