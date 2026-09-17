import React from 'react';
import get from 'lodash/get';
import StyledWrapper from './StyledWrapper';
import GrantTypeSelector from './GrantTypeSelector/index';
import OAuth2PasswordCredentials from './PasswordCredentials/index';
import OAuth2AuthorizationCode from './AuthorizationCode/index';
import OAuth2Implicit from './Implicit/index';
import OAuth2ClientCredentials from './ClientCredentials/index';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';

const GrantTypeComponentMap = ({ item, collection, request, updateAuth: updateAuthFn, save: saveFn }) => {
  const dispatch = useDispatch();

  const save = () => {
    if (saveFn) {
      return saveFn();
    }
    dispatch(saveRequest(item.uid, collection.uid));
  };

  const grantType = get(request, 'auth.oauth2.grantType', {});

  const handleRun = async () => {
    dispatch(sendRequest(item, collection.uid));
  };

  switch (grantType) {
    case 'password':
      return <OAuth2PasswordCredentials item={item} save={save} request={request} handleRun={handleRun} updateAuth={updateAuthFn} collection={collection} />;
    case 'authorization_code':
      return <OAuth2AuthorizationCode item={item} save={save} request={request} handleRun={handleRun} updateAuth={updateAuthFn} collection={collection} />;
    case 'implicit':
      return <OAuth2Implicit item={item} save={save} request={request} handleRun={handleRun} updateAuth={updateAuthFn} collection={collection} />;
    case 'client_credentials':
      return <OAuth2ClientCredentials item={item} save={save} request={request} handleRun={handleRun} updateAuth={updateAuthFn} collection={collection} />;
    default:
      return <div>TBD</div>;
  }
};

const OAuth2 = ({ item, collection, request: requestProp, updateAuth: updateAuthProp, save, disabled }) => {
  const request = requestProp || (item.draft ? get(item, 'draft.request', {}) : get(item, 'request', {}));
  const updateAuthFn = updateAuthProp || updateAuth;

  return (
    <StyledWrapper className="w-full">
      <GrantTypeSelector item={item} request={request} updateAuth={updateAuthFn} collection={collection} disabled={disabled} />
      <GrantTypeComponentMap
        item={item}
        collection={collection}
        request={request}
        updateAuth={updateAuthFn}
        save={save}
      />
    </StyledWrapper>
  );
};

export default OAuth2;
