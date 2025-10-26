import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { updateResponseExampleDetails } from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';

const ResponseExampleDescription = ({ editMode, item, collection, exampleUid }) => {
  const dispatch = useDispatch();

  const description = useMemo(() => {
    return item.draft
      ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.description || ''
      : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.description || '';
  }, [item, exampleUid]);

  const handleChange = (e) => {
    const newValue = e.target.value;

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
          data-testid="response-example-description-input"
          value={description}
          onChange={handleChange}
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
