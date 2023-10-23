import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { updateRequestDocs } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme/index';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import PaneContent from 'components/RequestPane/PaneContent/index';

const Documentation = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const docs = item.draft ? get(item, 'draft.request.docs', '') : get(item, 'request.docs', '');
  const [isEditing, setIsEditing] = useState(docs.length === 0);

  const toggleViewMode = () => {
    setIsEditing((prev) => !prev);
  };

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

  if (!item) {
    return null;
  }

  return (
    <PaneContent
      codeMirrorFull={isEditing}
      head={
        <div className="cursor-pointer mb-2 active" onClick={toggleViewMode}>
          {isEditing ? 'Preview' : 'Edit'}
        </div>
      }
    >
      {isEditing ? (
        <CodeEditor
          collection={collection}
          theme={storedTheme}
          value={docs}
          onEdit={onEdit}
          onSave={onSave}
          mode="application/text"
        />
      ) : (
        <Markdown onDoubleClick={toggleViewMode} content={docs} />
      )}
    </PaneContent>
  );
};

export default Documentation;
