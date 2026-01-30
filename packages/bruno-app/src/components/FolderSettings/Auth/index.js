import React from 'react';
import get from 'lodash/get';
import StyledWrapper from './StyledWrapper';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import OAuth2AuthorizationCode from 'components/RequestPane/Auth/OAuth2/AuthorizationCode/index';
import { updateFolderAuth as _updateFolderAuth } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import OAuth2PasswordCredentials from 'components/RequestPane/Auth/OAuth2/PasswordCredentials/index';
import OAuth2ClientCredentials from 'components/RequestPane/Auth/OAuth2/ClientCredentials/index';
import OAuth2Implicit from 'components/RequestPane/Auth/OAuth2/Implicit/index';
import GrantTypeSelector from 'components/RequestPane/Auth/OAuth2/GrantTypeSelector/index';
import AuthMode from '../AuthMode';
import BasicAuth from 'components/RequestPane/Auth/BasicAuth';
import BearerAuth from 'components/RequestPane/Auth/BearerAuth';
import DigestAuth from 'components/RequestPane/Auth/DigestAuth';
import NTLMAuth from 'components/RequestPane/Auth/NTLMAuth';
import WsseAuth from 'components/RequestPane/Auth/WsseAuth';
import ApiKeyAuth from 'components/RequestPane/Auth/ApiKeyAuth';
import AwsV4Auth from 'components/RequestPane/Auth/AwsV4Auth';
import { humanizeRequestAuthMode, getTreePathFromCollectionToItem } from 'utils/collections/index';
import Button from 'ui/Button';

const GrantTypeComponentMap = ({ collection, folder, updateFolderAuth }) => {
  const dispatch = useDispatch();

  const save = () => {
    dispatch(saveFolderRoot(collection.uid, folder.uid));
  };

  const folderRoot = folder?.draft || folder?.root;
  let request = get(folderRoot, 'request', {});
  const grantType = get(request, 'auth.oauth2.grantType', 'authorization_code');

  switch (grantType) {
    case 'password':
      return <OAuth2PasswordCredentials save={save} item={folder} request={request} updateAuth={updateFolderAuth} collection={collection} folder={folder} />;
    case 'authorization_code':
      return <OAuth2AuthorizationCode save={save} item={folder} request={request} updateAuth={updateFolderAuth} collection={collection} folder={folder} />;
    case 'client_credentials':
      return <OAuth2ClientCredentials save={save} item={folder} request={request} updateAuth={updateFolderAuth} collection={collection} folder={folder} />;
    case 'implicit':
      return <OAuth2Implicit save={save} item={folder} request={request} updateAuth={updateFolderAuth} collection={collection} folder={folder} />;
    default:
      return <div>TBD</div>;
  }
};

const Auth = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const folderRoot = folder?.draft || folder?.root;
  let request = get(folderRoot, 'request', {});
  const authMode = get(folderRoot, 'request.auth.mode');

  const getEffectiveAuthSource = () => {
    if (authMode !== 'inherit') return null;

    const collectionRoot = collection?.draft?.root || collection?.root || {};
    const collectionAuth = get(collectionRoot, 'request.auth');
    let effectiveSource = {
      type: 'collection',
      name: 'Collection',
      auth: collectionAuth
    };

    // Get path from collection to current folder
    const folderTreePath = getTreePathFromCollectionToItem(collection, folder);

    // Check parent folders to find closest auth configuration
    // Skip the last item which is the current folder
    for (let i = 0; i < folderTreePath.length - 1; i++) {
      const parentFolder = folderTreePath[i];
      if (parentFolder.type === 'folder') {
        const parentFolderRoot = parentFolder?.draft || parentFolder?.root;
        const folderAuth = get(parentFolderRoot, 'request.auth');
        if (folderAuth && folderAuth.mode && folderAuth.mode !== 'inherit') {
          effectiveSource = {
            type: 'folder',
            name: parentFolder.name,
            auth: folderAuth
          };
          break;
        }
      }
    }

    return effectiveSource;
  };

  const handleSave = () => {
    dispatch(saveFolderRoot(collection.uid, folder.uid));
  };

  const updateFolderAuth = ({ itemUid, ...rest }) => {
    return _updateFolderAuth({
      ...rest,
      folderUid: folder.uid
    });
  };

  const getAuthView = () => {
    switch (authMode) {
      case 'basic': {
        return (
          <BasicAuth
            collection={collection}
            item={folder}
            updateAuth={updateFolderAuth}
            request={request}
            save={() => handleSave()}
          />
        );
      }
      case 'bearer': {
        return (
          <BearerAuth
            collection={collection}
            item={folder}
            updateAuth={updateFolderAuth}
            request={request}
            save={() => handleSave()}
          />
        );
      }
      case 'digest': {
        return (
          <DigestAuth
            collection={collection}
            item={folder}
            updateAuth={updateFolderAuth}
            request={request}
            save={() => handleSave()}
          />
        );
      }
      case 'ntlm': {
        return (
          <NTLMAuth
            collection={collection}
            item={folder}
            updateAuth={updateFolderAuth}
            request={request}
            save={() => handleSave()}
          />
        );
      }
      case 'wsse': {
        return (
          <WsseAuth
            collection={collection}
            item={folder}
            updateAuth={updateFolderAuth}
            request={request}
            save={() => handleSave()}
          />
        );
      }
      case 'apikey': {
        return (
          <ApiKeyAuth
            collection={collection}
            item={folder}
            updateAuth={updateFolderAuth}
            request={request}
            save={() => handleSave()}
          />
        );
      }
      case 'awsv4': {
        return (
          <AwsV4Auth
            collection={collection}
            item={folder}
            updateAuth={updateFolderAuth}
            request={request}
            save={() => handleSave()}
          />
        );
      }
      case 'oauth2': {
        return (
          <>
            <GrantTypeSelector
              request={request}
              updateAuth={updateFolderAuth}
              collection={collection}
              item={folder}
            />
            <GrantTypeComponentMap collection={collection} folder={folder} updateFolderAuth={updateFolderAuth} />
          </>
        );
      }
      case 'inherit': {
        const source = getEffectiveAuthSource();
        return (
          <>
            <div className="flex flex-row w-full mt-2 gap-2">
              <div>Auth inherited from {source.name}: </div>
              <div className="inherit-mode-text">{humanizeRequestAuthMode(source.auth?.mode)}</div>
            </div>
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
      <div className="flex flex-grow justify-start items-center">
        <AuthMode collection={collection} folder={folder} />
      </div>
      {getAuthView()}
      <div className="mt-6">
        <Button type="submit" size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </StyledWrapper>
  );
};

export default Auth;
