import SingleLineEditor from 'components/SingleLineEditor';
import get from 'lodash/get';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';

const BearerAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const bearer = item.draft ? get(item, 'draft.request.auth.bearer', {}) : get(item, 'request.auth.bearer', {});

  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  const handleSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const handlePrefixChange = (prefix) => {
    dispatch(
      updateAuth({
        mode: 'bearer',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          prefix: prefix,
          token: bearer.token
        }
      })
    );
  };

  const handleTokenChange = (token) => {
    dispatch(
      updateAuth({
        mode: 'bearer',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          prefix: bearer.prefix,
          token: token
        }
      })
    );
  };

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Prefix</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={bearer.prefix || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handlePrefixChange(val)}
          onRun={handleRun}
          collection={collection}
        />
      </div>
      <label className="block font-medium mb-2">Token</label>
      <div className="single-line-editor-wrapper">
        <SingleLineEditor
          value={bearer.token || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleTokenChange(val)}
          onRun={handleRun}
          collection={collection}
        />
      </div>
    </StyledWrapper>
  );
};

export default BearerAuth;
