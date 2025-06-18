import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest, saveMultipleRequests } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { extractDrafts } from 'utils/collections/index';

const BearerAuth = ({ item, collection, updateAuth, request, save }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  // Use the request prop directly like OAuth2ClientCredentials does
  const bearerToken = get(request, 'auth.bearer.token', '');

  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleSave = () => {
    save();
  };
  const handleSaveAll = () => {
    dispatch(saveMultipleRequests(extractDrafts(collection)));
  };

  const handleTokenChange = (token) => {
    dispatch(
      updateAuth({
        mode: 'bearer',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          token: token
        }
      })
    );
  };

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Token</label>
      <div className="single-line-editor-wrapper">
        <SingleLineEditor
          value={bearerToken}
          theme={storedTheme}
          onSave={handleSave}
          onSaveAll={handleSaveAll}
          onChange={(val) => handleTokenChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
          isSecret={true}
        />
      </div>
    </StyledWrapper>
  );
};

export default BearerAuth;
