import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { updateCollectionDocs } from 'providers/ReduxStore/slices/collections';
import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { buildAiVariablesPayload, buildDocsContextFromCollection } from 'utils/ai';
import StyledWrapper from './StyledWrapper';
import { IconEdit, IconFileText } from '@tabler/icons';
import Button from 'ui/Button/index';
import ActionIcon from 'ui/ActionIcon/index';
import { usePersistedState } from 'hooks/usePersistedState';
import { useDocsEditingState } from 'components/Documentation/useDocsEditingState';
import DocsEditor from 'components/Documentation/DocsEditor';

const Docs = ({ collection }) => {
  const dispatch = useDispatch();
  const { isEditing, setEditing } = useDocsEditingState();
  const savedDocs = get(collection, 'root.docs', '');
  const docs = collection.draft?.root ? get(collection, 'draft.root.docs', '') : savedDocs;
  const docsContext = useMemo(() => buildDocsContextFromCollection(collection), [collection]);
  const aiVariables = useMemo(() => buildAiVariablesPayload(collection, null), [collection]);

  // separate scroll positions for rich-text and markdown views since
  // their layouts are independent.
  const [richTextScroll, setRichTextScroll] = usePersistedState({ key: `collection-docs-scroll-richtext-${collection.uid}`, default: 0 });
  const [markdownScroll, setMarkdownScroll] = usePersistedState({ key: `collection-docs-scroll-markdown-${collection.uid}`, default: 0 });

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
        docs: savedDocs
      }))
    );
    toggleViewMode();
  };

  const onSave = () => {
    dispatch(saveCollectionSettings(collection.uid));
    toggleViewMode();
  };

  return (
    <StyledWrapper className="h-full w-full relative flex flex-col">
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
          ) : null}
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
          initialRichTextScroll={richTextScroll}
          onRichTextScrollChange={setRichTextScroll}
          initialMarkdownScroll={markdownScroll}
          onMarkdownScrollChange={setMarkdownScroll}
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
