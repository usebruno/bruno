import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import find from 'lodash/find';
import { updateCollectionDocs, deleteCollectionDraft } from 'providers/ReduxStore/slices/collections';
import { updateDocsEditing } from 'providers/ReduxStore/slices/tabs';
import { useTheme } from 'providers/Theme';
import { useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { buildAiVariablesPayload, buildDocsContextFromCollection } from 'utils/ai';
import StyledWrapper from './StyledWrapper';
import { IconEdit, IconFileText } from '@tabler/icons';
import Button from 'ui/Button/index';
import ActionIcon from 'ui/ActionIcon/index';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import { useDocsEditingState } from 'components/Documentation/useDocsEditingState';
import DocsEditor from 'components/Documentation/DocsEditor';
import get from 'lodash/get';

const Docs = ({ collection }) => {
  const dispatch = useDispatch();
  const { isEditing, setEditing } = useDocsEditingState();
  const docs = collection.draft?.root ? get(collection, 'draft.root.docs', '') : get(collection, 'root.docs', '');
  const docsContext = useMemo(() => buildDocsContextFromCollection(collection), [collection]);
  const aiVariables = useMemo(() => buildAiVariablesPayload(collection, null), [collection]);
  const preferences = useSelector((state) => state.app.preferences);

  // The rich text editor owns its own scroll container. Preview and rich-text
  // edit mode track scroll there; markdown mode uses CodeEditor's onScroll/initialScroll.
  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `collection-docs-scroll-${collection.uid}`, default: 0 });
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
      updateCollectionDocs({
        collectionUid: collection.uid,
        docs: value
      })
    );
  };

  const handleDiscardChanges = () => {
    dispatch((
      updateCollectionDocs({
        collectionUid: collection.uid,
        docs: docs
      }))
    );
    toggleViewMode();
  };

  const onSave = () => {
    dispatch(saveCollectionSettings(collection.uid));
    toggleViewMode();
  };

  return (
    <StyledWrapper className="h-full w-full relative flex flex-col" ref={wrapperRef}>
      <div className="flex flex-row w-full justify-between items-center mb-4">
        <div className="text-lg font-medium flex items-center gap-2">
          <IconFileText size={20} strokeWidth={1.5} />
          Documentation
        </div>
        <div className="flex flex-row gap-2 items-center justify-center">
          {isEditing ? (
            <>
              <Button type="button" color="secondary" onClick={handleDiscardChanges}>
                Cancel
              </Button>
              <Button type="button" onClick={onSave}>
                Save
              </Button>
            </>
          ) : (
            <ActionIcon className="editing-mode" onClick={toggleViewMode}>
              <IconEdit className="cursor-pointer" size={16} strokeWidth={1.5} />
            </ActionIcon>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <DocsEditor
          docs={docs}
          onEdit={onEdit}
          onSave={onSave}
          isEditing={isEditing}
          collection={collection}
          collectionPath={collection.pathname}
          docsContext={docsContext}
          variables={aiVariables}
          emptyPreviewContent={documentationPlaceholder}
          onRequestEdit={toggleViewMode}
          initialScroll={scroll}
          onScroll={setScroll}
        />
      </div>
    </StyledWrapper>
  );
};

export default Docs;

const documentationPlaceholder = `
Welcome to your collection documentation! This space is designed to help you document your API collection effectively.

## Overview
Use this section to provide a high-level overview of your collection. You can describe:
- The purpose of these API endpoints
- Key features and functionalities
- Target audience or users

## Best Practices
- Keep documentation up to date
- Include request/response examples
- Document error scenarios
- Add relevant links and references

## Markdown Support
This documentation supports Markdown formatting! You can use:
- **Bold** and *italic* text
- \`code blocks\` and syntax highlighting
- Tables and lists
- [Links](https://usebruno.com)
- And more!
`;
