import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { updateRequestDocs } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';

const Documentation = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const docs = item.draft ? get(item, 'draft.request.docs') : get(item, 'request.docs');
  const preferences = useSelector((state) => state.app.preferences);

  const updateCodeMirrorHeight = (parentId, offsetTop) => {
    const codeMirror = document.querySelector(parentId + ' .CodeMirror');
    const pane = document.querySelector('.request-pane');
    if (codeMirror !== null && pane !== null) {
      let newHeight = pane.offsetHeight - offsetTop;
      if (newHeight !== codeMirror.style.height) {
        codeMirror.style.height = newHeight + 'px';
      }
    }
  };

  useEffect(() => {
    updateCodeMirrorHeight('#documentation-tab', 80);
  });

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
    <StyledWrapper id="documentation-tab" className="h-full w-full flex flex-col">
      <div className="editing-mode mb-2 mt-1" role="tab" onClick={toggleViewMode}>
        {isEditing ? 'Preview' : 'Edit'}
      </div>

      {isEditing ? (
        <CodeEditor
          collection={collection}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          value={docs || ''}
          onEdit={onEdit}
          onSave={onSave}
          mode="application/text"
        />
      ) : (
        <Markdown onDoubleClick={toggleViewMode} content={docs} />
      )}
    </StyledWrapper>
  );
};

export default Documentation;
