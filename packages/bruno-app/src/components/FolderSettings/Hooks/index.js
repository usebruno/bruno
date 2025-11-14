import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import Hooks from 'components/Hooks';
import { updateFolderHooks } from 'providers/ReduxStore/slices/collections';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const FolderHooks = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const hooks = folder.draft ? get(folder, 'draft.request.hooks', '') : get(folder, 'root.request.hooks', '');

  const onEdit = (value) => {
    dispatch(updateFolderHooks({
      hooks: value,
      collectionUid: collection.uid,
      folderUid: folder.uid
    }));
  };

  const handleSave = () => dispatch(saveFolderRoot(collection.uid, folder.uid));

  return (
    <StyledWrapper className="w-full flex flex-col h-full">
      <div className="text-xs mb-4 text-muted">
        Write hooks that will run for any request in this folder. Use hooks to register event handlers for pre-request, post-response, and other lifecycle events.
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

export default FolderHooks;
