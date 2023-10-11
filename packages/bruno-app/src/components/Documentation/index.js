import TextareaEditor from 'components/TextareaEditor/index';
import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import MarkdownIt from 'markdown-it';
import { updateRequestDocs } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme/index';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import MarkdownBody from './MarkdownBody';
import StyledContentWrapper from './StyledContentWrapper';
import StyledWrapper from './StyledWrapper';

const md = new MarkdownIt();

const Documentation = ({ item, collection }) => {
  const dispatch = useDispatch();
  const themeContext = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const docs = item.draft ? get(item, 'draft.request.docs') : get(item, 'request.docs');

  const toggleViewMode = () => {
    setIsEditing((prev) => !prev);
  };

  const handleChange = (e) => {
    dispatch(
      updateRequestDocs({
        itemUid: item.uid,
        collectionUid: collection.uid,
        docs: e.target.value
      })
    );
  };

  const htmlFromMarkdown = md.render(docs);

  if (!item) {
    return null;
  }

  return (
    <StyledWrapper theme={themeContext.theme}>
      <div
        className="inline-block m-1 mb-0"
        style={{ backgroundColor: themeContext.theme.rightPane.bg, width: '-webkit-fill-available' }}
      >
        <button className="text-end float-right mr-6 text-blue-400" onClick={toggleViewMode}>
          {isEditing ? 'Preview' : 'Edit'}
        </button>
      </div>

      <StyledContentWrapper theme={themeContext.theme}>
        {isEditing ? (
          <TextareaEditor className="w-full h-full" onChange={handleChange} value={docs || ''} />
        ) : (
          <MarkdownBody OnDoubleClick={toggleViewMode} theme={themeContext.theme}>
            {htmlFromMarkdown}
          </MarkdownBody>
        )}
      </StyledContentWrapper>
    </StyledWrapper>
  );
};

export default Documentation;
