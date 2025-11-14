import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import Hooks from 'components/Hooks';
import { updateRequestHooks } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const RequestHooks = ({ item, collection }) => {
  const dispatch = useDispatch();
  const hooks = item.draft ? get(item, 'draft.request.hooks', '') : get(item, 'request.hooks', '');

  const onEdit = (value) => {
    dispatch(updateRequestHooks({
      hooks: value,
      collectionUid: collection.uid,
      itemUid: item.uid
    }));
  };

  const handleSave = () => dispatch(saveRequest(item.uid, collection.uid));

  return (
    <StyledWrapper className="w-full flex flex-col h-full">
      <div className="text-xs mb-4 text-muted">
        Write hooks that will run for this request. Use hooks to register event handlers for pre-request, post-response, and other lifecycle events.
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

export default RequestHooks;
