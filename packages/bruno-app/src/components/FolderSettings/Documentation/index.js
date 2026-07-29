import get from 'lodash/get';
import { updateFolderDocs } from 'providers/ReduxStore/slices/collections';
import { useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { buildAiVariablesPayload, buildDocsContextFromFolder } from 'utils/ai';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import { useDocsEditingState } from 'components/Documentation/useDocsEditingState';
import DocsEditor from 'components/Documentation/DocsEditor';

const Documentation = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const { isEditing, setEditing } = useDocsEditingState();
  const docs = folder.draft ? get(folder, 'draft.docs', '') : get(folder, 'root.docs', '');

  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `folder-docs-scroll-${folder.uid}`, default: 0 });
  useTrackScroll({
    ref: wrapperRef,
    selector: '.rich-text-editor-content',
    onChange: setScroll,
    enabled: !isEditing,
    initialValue: scroll
  });

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
    <StyledWrapper className="w-full relative flex flex-col" ref={wrapperRef}>
      <div className="editing-mode flex justify-between items-center flex-shrink-0" role="tab" onClick={toggleViewMode}>
        {isEditing ? 'Preview' : 'Edit'}
      </div>

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
