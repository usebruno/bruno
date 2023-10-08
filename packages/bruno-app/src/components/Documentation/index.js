import { IconX } from '@tabler/icons';
import 'github-markdown-css/github-markdown.css';
import MarkdownIt from 'markdown-it';
import { updateRequestDocs } from 'providers/ReduxStore/slices/collections/index';
import { closeDocs } from 'providers/ReduxStore/slices/docs';
import { useTheme } from 'providers/Theme/index';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { findCollectionByUid, findItemInCollection } from 'utils/collections/index';
import Editor from './DocumentEditor';
import MarkdownBody from './MarkdownBody';
import StyledContentWrapper from './StyledContentWrapper';
import StyledWrapper from './StyledWrapper';

const md = new MarkdownIt();
const getItem = (collections, collectionUid, itemUid) => {
  const collection = findCollectionByUid(collections, collectionUid);
  if (!collection) {
    return new Error('Collection not found');
  }

  const item = findItemInCollection(collection, itemUid);
  if (!item) {
    return new Error('Item not found');
  }

  return item;
};

const Documentation = () => {
  const dispatch = useDispatch();
  const themeContext = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const collections = useSelector((state) => state.collections);
  const isShowDocs = useSelector((state) => state.docs.isShow);

  const tab = tabs.find((tab) => tab.uid === activeTabUid);
  const item = getItem(collections.collections, tab?.collectionUid, tab?.uid);

  const [isEditing, setIsEditing] = useState(false);

  const draftDocs = item.draft?.request?.docs;
  const savedDocs = item?.request?.docs || '';
  const docs = draftDocs !== undefined ? draftDocs : savedDocs;

  const toggleViewMode = () => {
    setIsEditing((prev) => !prev);
  };

  const setCloseDocs = () => {
    dispatch(closeDocs());
  };

  const handleChange = (e) => {
    dispatch(
      updateRequestDocs({
        itemUid: tab.uid,
        collectionUid: tab.collectionUid,
        docs: e.target.value
      })
    );
  };

  const htmlFromMarkdown = md.render(docs);

  if (!isShowDocs) {
    return null;
  }

  if (!tab) {
    return null;
  }

  return (
    <StyledWrapper className="h-screen" theme={themeContext.theme}>
      <button className="btn absolute top-2 right-2" onClick={setCloseDocs}>
        <IconX />
      </button>

      <div
        className="inline-block m-1 mt-5 mb-0"
        style={{ backgroundColor: themeContext.theme.rightPane.bg, width: '-webkit-fill-available' }}
      >
        <h3 className="mb-2 ml-4 font-bold float-left"> Documentation </h3>
        <button className="text-end float-right mr-6 text-blue-400" onClick={toggleViewMode}>
          {isEditing ? 'Preview' : 'Edit'}
        </button>
      </div>

      <StyledContentWrapper theme={themeContext.theme}>
        {isEditing ? (
          <Editor className="w-full h-full" onChange={handleChange} value={docs} />
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
