import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import Hooks from 'components/Hooks';
import { updateCollectionHooks } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const CollectionHooks = ({ collection }) => {
  const dispatch = useDispatch();
  const hooks = collection.draft?.root ? get(collection, 'draft.root.request.hooks', '') : get(collection, 'root.request.hooks', '');

  const onEdit = (value) => {
    dispatch(updateCollectionHooks({
      hooks: value,
      collectionUid: collection.uid
    }));
  };

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  return (
    <StyledWrapper className="w-full flex flex-col h-full">
      <div className="text-xs mb-4 text-muted">
        Write hooks that will run for any request in this collection. Use hooks to register event handlers for pre-request, post-response, and other lifecycle events.
      </div>
      <Hooks
        collection={collection}
        value={hooks || ''}
        onEdit={onEdit}
        onSave={handleSave}
        showHintsFor={['req', 'res', 'bru']}
      />

      <div className="mt-6">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default CollectionHooks;
