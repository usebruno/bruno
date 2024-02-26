import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const OAuth2ClientCredentials = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const oAuth = item.draft ? get(item, 'draft.request.auth.oauth2', {}) : get(item, 'request.auth.oauth2', {});

  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  const handleSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const handleClientIdChange = (clientId) => {
    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          grantType: 'client_credentials',
          clientId: clientId,
          clientSecret: oAuth.clientSecret
        }
      })
    );
  };

  const handleClientSecretChange = (clientSecret) => {
    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          grantType: 'client_credentials',
          clientId: oAuth.clientId,
          clientSecret: clientSecret
        }
      })
    );
  };

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Client Id</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={oAuth.clientId || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleClientIdChange(val)}
          onRun={handleRun}
          collection={collection}
        />
      </div>

      <label className="block font-medium mb-2">Client Secret</label>
      <div className="single-line-editor-wrapper">
        <SingleLineEditor
          value={oAuth.clientSecret || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleClientSecretChange(val)}
          onRun={handleRun}
          collection={collection}
        />
      </div>
    </StyledWrapper>
  );
};

export default OAuth2ClientCredentials;
