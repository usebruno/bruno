import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { updateRequestDocs } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';
import WysiwygEditor from 'components/WysiwygEditor/index';
import { IconMarkdown, IconFileDescription } from '@tabler/icons-react';
import { Tooltip } from 'react-tooltip';
import ModeSwitch from 'components/ModeSwitch/index';
import { useEditor } from '@tiptap/react';

const Documentation = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [isMarkdown, setIsMarkdown] = useState(true);
  const docs = item.draft ? get(item, 'draft.request.docs') : get(item, 'request.docs');
  const preferences = useSelector((state) => state.app.preferences);
  const editor = useEditor({
    extensions: WysiwygEditor.extensions,
    content: docs,
    onUpdate: ({ editor }) => {
      onEdit(editor.storage.markdown.getMarkdown());
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault();
          onSave();
          return true;
        }
        return false;
      }
    }
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

  const getTabClassname = (tabName) => {
    if (isEditing && tabName === 'Write') {
      return 'flex cursor-pointer border-b-2 border-primary-500';
    } else if (!isEditing && tabName === 'Preview') {
      return 'flex cursor-pointer border-b-2 border-primary-500';
    }

    return 'flex cursor-pointer';
  };

  if (!item) {
    return null;
  }

  return (
    <StyledWrapper className="flex flex-col mt-3 gap-y-1 h-full w-full relative">
      <div className="flex items-center border-b rounded-sm mb-2  border-gray-600 gap-y-1  relative">
        {isMarkdown ? (
          <div className="flex align-bottom h-full gap-2" role="tablist">
            <div className={getTabClassname('Write')} role="tab" onClick={() => setIsEditing(true)}>
              Write
            </div>
            <div className={getTabClassname('Preview')} role="tab" onClick={() => setIsEditing(false)}>
              Preview
            </div>
          </div>
        ) : (
          <WysiwygEditor.MenuBar editor={editor} />
        )}
        <ModeSwitch
          checked={isMarkdown}
          onChange={() => setIsMarkdown((prev) => !prev)}
          rightComponent={
            <>
              <IconMarkdown id="markdown" className="focus:outline-none" size={18} />
              <Tooltip anchorId="markdown" place="top" html="Markdown mode" />
            </>
          }
          leftComponent={
            <>
              <IconFileDescription id="wysiwyg" className="focus:outline-none" size={18} />
              <Tooltip anchorId="wysiwyg" place="top" html="Wysiwyg mode" />
            </>
          }
          className="ml-auto mb-2"
        />
      </div>

      {isMarkdown ? (
        <section className="h-full">
          {isEditing ? (
            <CodeEditor
              collection={collection}
              theme={displayedTheme}
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
              value={docs || ''}
              onEdit={onEdit}
              onSave={onSave}
              mode="application/text"
            />
          ) : (
            <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={docs} />
          )}
        </section>
      ) : (
        <section className="flex flex-col h-full w-full" style={{}}>
          <WysiwygEditor editor={editor} />
        </section>
      )}
    </StyledWrapper>
  );
};

export default Documentation;
