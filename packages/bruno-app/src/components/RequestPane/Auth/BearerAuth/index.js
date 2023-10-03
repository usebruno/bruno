import React, { useState } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateBearerToken } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const BearerAuth = ({ onTokenChange, item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const bearerToken = item.draft
    ? get(item, 'draft.request.auth.bearer.token')
    : get(item, 'request.auth.bearer.token');

  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  const handleSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const handleTokenChange = (token) => {
    dispatch(
      updateBearerToken({
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
      <label htmlFor="bearerToken" className="block font-medium mb-2">
        Token
      </label>
      <div className="single-line-editor-wrapper">
        <SingleLineEditor
          value={bearerToken}
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
