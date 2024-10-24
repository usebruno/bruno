import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import {
  updateCollectionDocs,
  revertCollectionDocs,
  saveCollectionDocs
} from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import { saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import MarkDownEditor from 'components/MarkDownEditor';
import StyledWrapper from './StyledWrapper';

const Docs = ({ collection }) => {
  const dispatch = useDispatch();
  const defaultDocs =
    "This collection doesn't have any documentation yet!\n\n\n---\n\n" +
    '*To get started, either double-click this text, or select the ' +
    '`Edit` button in the bottom right corner to start editing.*';
  const docs = get(collection, 'root.docs.current', null);
  const isEditing = get(collection, 'root.docs.editing', false);

  const onEdit = (value) => {
    // This does not save the docs, but it does cache them.
    // If the application closes without the user saving, any changes will be lost.
    dispatch(
      updateCollectionDocs({
        collectionUid: collection.uid,
        docs: value
      })
    );
  };

  const onSave = () => {
    // this marks the docs as not dirty
    dispatch(saveCollectionDocs({ collectionUid: collection.uid }));
    dispatch(saveCollectionRoot(collection.uid));
  };

  const onCancel = () => {
    dispatch(revertCollectionDocs({ collectionUid: collection.uid }));
  };

  return (
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">Collection-wide documentation.</div>
      <MarkDownEditor
        collection={collection}
        content={docs}
        defaultContent={defaultDocs}
        isCurrentlyEditing={isEditing}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
      />
    </StyledWrapper>
  );
};

export default Docs;
