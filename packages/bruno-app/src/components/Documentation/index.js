import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { updateRequestDocs } from 'providers/ReduxStore/slices/collections';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useDocsEditingState } from './useDocsEditingState';
import DocsEditor from './DocsEditor';

const Documentation = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { isEditing, setEditing } = useDocsEditingState();
  const docs = item?.draft ? get(item, 'draft.request.docs') : get(item, 'request.docs');

  // Scroll tracking (both the rich-text preview/edit view and markdown mode's
  // CodeEditor) lives in DocsEditor itself; this just owns the persisted value.
  const [scroll, setScroll] = usePersistedState({ key: `request-docs-scroll-${item?.uid}`, default: 0 });

  const onEdit = useCallback(
    (value) => {
      if (!item) return;
      dispatch(
        updateRequestDocs({
          itemUid: item.uid,
          collectionUid: collection.uid,
          docs: value
        })
      );
    },
    [collection.uid, dispatch, item]
  );

  const onSave = useCallback(() => {
    if (!item) return;
    dispatch(saveRequest(item.uid, collection.uid));
  }, [collection.uid, dispatch, item]);

  if (!item) {
    return null;
  }

  return (
    <StyledWrapper className="h-full w-full min-w-0 max-w-full relative">
      <DocsEditor
        docs={docs}
        onEdit={onEdit}
        onSave={onSave}
        isEditing={isEditing}
        item={item}
        collection={collection}
        collectionPath={collection?.pathname}
        onRequestEdit={() => setEditing(true)}
        initialScroll={scroll}
        onScroll={setScroll}
        testId="docs-editor"
      />
    </StyledWrapper>
  );
};

export default Documentation;
