import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { updateRequestDocs, revertRequestDocs } from 'providers/ReduxStore/slices/collections';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import MarkDownEditor from 'components/MarkDownEditor';
import StyledWrapper from './StyledWrapper';

const Documentation = ({ item, collection }) => {
  const dispatch = useDispatch();
  const defaultDocs =
    "This request doesn't have any documentation yet!\n\n\n---\n\n" +
    '*To get started, either double-click this text, or select the ' +
    '`Edit` button in the bottom right corner to start editing.*';
  const [isEditing, setIsEditing] = useState(item.draft !== null);
  const docs = isEditing ? get(item, 'draft.request.docs') : get(item, 'request.docs');
  // const docs = item.draft ? get(item, 'draft.request.docs') : get(item, 'request.docs');
  // const preferences = useSelector((state) => state.app.preferences);

  const onEdit = (value) => {
    dispatch(
      updateRequestDocs({
        itemUid: item.uid,
        collectionUid: collection.uid,
        docs: value
      })
    );
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const onCancel = () => {
    dispatch(revertRequestDocs({ itemUid: item.uid, collectionUid: collection.uid }));
  };

  if (!item) {
    return null;
  }

  return (
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">Request-level documentation.</div>
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

export default Documentation;
