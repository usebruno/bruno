import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { updateResponseExampleDetails } from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';

const ResponseExampleDescription = ({ editMode, item, collection, exampleUid }) => {
  const dispatch = useDispatch();

  // Get description from item draft, similar to how RequestHeaders works
  const description = item.draft ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.description || '' : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.description || '';

  const [value, setValue] = useState(description || '');

  // Update local state when description changes
  useEffect(() => {
    setValue(description || '');
  }, [description]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (editMode && item && collection && exampleUid) {
      dispatch(updateResponseExampleDetails({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        details: {
          description: newValue
        }
      }));
    }
  };

  return (
    <StyledWrapper className="w-full">
      <div className="mb-2">
        <textarea
          value={value}
          onChange={editMode ? handleChange : () => {}}
          readOnly={!editMode}
          placeholder="Enter example description..."
          className="w-full p-3 border rounded-md"
          rows={1}
        />
      </div>
    </StyledWrapper>
  );
};

export default ResponseExampleDescription;
