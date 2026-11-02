import React from 'react';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateCollectionAuth } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const BearerAuth = ({ collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const bearerToken = collection.draft?.root ? get(collection, 'draft.root.request.auth.bearer.token', '') : get(collection, 'root.request.auth.bearer.token', '');

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  const handleTokenChange = (token) => {
    dispatch(
      updateCollectionAuth({
        mode: 'bearer',
        collectionUid: collection.uid,
        content: {
          token: token
        }
      })
    );
  };

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block mb-1">Token</label>
      <div className="single-line-editor-wrapper flex items-center">
        <SingleLineEditor
          value={bearerToken}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleTokenChange(val)}
          collection={collection}
          isSecret={true}
          isCompact
        />
        <SensitiveFieldWarning fieldName="bearer-token" secretName="token" value={bearerToken} collection={collection} onReplaceValue={handleTokenChange} />
      </div>
    </StyledWrapper>
  );
};

export default BearerAuth;
