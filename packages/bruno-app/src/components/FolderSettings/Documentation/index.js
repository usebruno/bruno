import get from 'lodash/get';
import { updateFolderDocs } from 'providers/ReduxStore/slices/collections';
import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { buildAiVariablesPayload, buildDocsContextFromFolder } from 'utils/ai';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useDocsEditingState } from 'components/Documentation/useDocsEditingState';
import DocsEditor from 'components/Documentation/DocsEditor';

const Documentation = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const { isEditing, setEditing } = useDocsEditingState();
  const docs = folder.draft ? get(folder, 'draft.docs', '') : get(folder, 'root.docs', '');

  // Scroll tracking (both the rich-text preview/edit view and markdown mode's
  // CodeEditor) lives in DocsEditor itself; this just owns the persisted value.
  const [scroll, setScroll] = usePersistedState({ key: `folder-docs-scroll-${folder.uid}`, default: 0 });

  const toggleViewMode = () => {
    setEditing(!isEditing);
  };

  const onEdit = (value) => {
    dispatch(
      updateFolderDocs({
        folderUid: folder.uid,
        collectionUid: collection.uid,
        docs: value
      })
    );
  };

  const onSave = () => dispatch(saveFolderRoot(collection.uid, folder.uid));
  const docsContext = useMemo(() => buildDocsContextFromFolder(collection, folder), [collection, folder]);
  const aiVariables = useMemo(() => buildAiVariablesPayload(collection, folder), [collection, folder]);

  if (!folder) {
    return null;
  }

  return (
    <StyledWrapper className="w-full relative flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col">
        <DocsEditor
          docs={docs}
          onEdit={onEdit}
          onSave={onSave}
          isEditing={isEditing}
          collection={collection}
          collectionPath={collection.pathname}
          docsContext={docsContext}
          variables={aiVariables}
          onRequestEdit={toggleViewMode}
          initialScroll={scroll}
          onScroll={setScroll}
        />
      </div>

      {isEditing && (
        <div className="mt-6 flex-shrink-0">
          <Button type="submit" size="sm" onClick={onSave}>
            Save
          </Button>
        </div>
      )}
    </StyledWrapper>
  );
};

export default Documentation;
