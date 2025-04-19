import React from 'react';
import get from 'lodash/get';
import StyledWrapper from './StyledWrapper';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import OAuth2AuthorizationCode from 'components/RequestPane/Auth/OAuth2/AuthorizationCode/index';
import { updateFolderAuth } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import OAuth2PasswordCredentials from 'components/RequestPane/Auth/OAuth2/PasswordCredentials/index';
import OAuth2ClientCredentials from 'components/RequestPane/Auth/OAuth2/ClientCredentials/index';
import GrantTypeSelector from 'components/RequestPane/Auth/OAuth2/GrantTypeSelector/index';
import AuthMode from '../AuthMode';

const GrantTypeComponentMap = ({ collection, folder }) => {
  const dispatch = useDispatch();

  const save = () => {
    dispatch(saveFolderRoot(collection.uid, folder.uid));
  };

  let request = get(folder, 'root.request', {});
  const grantType = get(request, 'auth.oauth2.grantType', 'authorization_code');

  switch (grantType) {
    case 'password':
      return <OAuth2PasswordCredentials save={save} item={folder} request={request} updateAuth={updateFolderAuth} collection={collection} folder={folder} />;
    case 'authorization_code':
      return <OAuth2AuthorizationCode save={save} item={folder} request={request} updateAuth={updateFolderAuth} collection={collection} folder={folder} />;
    case 'client_credentials':
      return <OAuth2ClientCredentials save={save} item={folder} request={request} updateAuth={updateFolderAuth} collection={collection} folder={folder} />;
    default:
      return <div>TBD</div>;
  }
};

const Auth = ({ collection, folder }) => {
  const dispatch = useDispatch();
  let request = get(folder, 'root.request', {});
  const authMode = get(folder, 'root.request.auth.mode');

  const handleSave = () => {
    dispatch(saveFolderRoot(collection.uid, folder.uid));
  };

  const getAuthView = () => {
    switch (authMode) {
      case 'oauth2': {
        return (
          <>
            <GrantTypeSelector
              request={request} 
              updateAuth={updateFolderAuth} 
              collection={collection}
              item={folder}
            />
            <GrantTypeComponentMap collection={collection} folder={folder} />
          </>
        );
      }
      case 'none': {
        return null;
      }
      default:
        return null;
    }
  };

  return (
    <StyledWrapper className="w-full">
      <div className="text-xs mb-4 text-muted">
        Configures authentication for the entire folder. This applies to all requests using the{' '}
        <span className="font-medium">Inherit</span> option in the <span className="font-medium">Auth</span> tab.
      </div>
      <div className="flex flex-grow justify-start items-center mb-4">
        <AuthMode collection={collection} folder={folder} />
      </div>
      {getAuthView()}
      <div className="mt-6">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default Auth; 