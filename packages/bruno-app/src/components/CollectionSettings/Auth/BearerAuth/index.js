import SingleLineEditor from 'components/SingleLineEditor';
import get from 'lodash/get';
import { updateCollectionAuth } from 'providers/ReduxStore/slices/collections';
import { saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';

const BearerAuth = ({ collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const bearer = get(collection, 'root.request.auth.bearer', {});

  const handleSave = () => dispatch(saveCollectionRoot(collection.uid));

  const handlePrefixChange = (prefix) => {
    dispatch(
      updateCollectionAuth({
        mode: 'bearer',
        collectionUid: collection.uid,
        content: {
          prefix: prefix,
          token: bearer.token
        }
      })
    );
  };

  const handleTokenChange = (token) => {
    dispatch(
      updateCollectionAuth({
        mode: 'bearer',
        collectionUid: collection.uid,
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
          collection={collection}
        />
      </div>
    </StyledWrapper>
  );
};

export default BearerAuth;
