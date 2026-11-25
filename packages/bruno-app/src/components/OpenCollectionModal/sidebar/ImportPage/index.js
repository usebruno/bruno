import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { IconAlertTriangle, IconExternalLink, IconLink, IconLoader2, IconUpload } from '@tabler/icons';
import { loadImportFiles, loadImportText } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import DropZone from '../../components/DropZone';
import { useImportHandoff } from '../../components/ImportHandoff/context';
import { isDraggingFiles } from '../../utils/dropped-items';
import StyledWrapper from './StyledWrapper';
import { isZipUrl } from './utils';

const ACCEPTED_FILE_TYPES = [
  '.json',
  '.yaml',
  '.yml',
  '.wsdl',
  '.zip',
  'application/json',
  'application/yaml',
  'application/x-yaml',
  'application/zip',
  'application/x-zip-compressed',
  'text/xml',
  'application/xml'
].join(',');

const DOCS_LINKS = [
  {
    label: 'Migrating from Postman?',
    url: 'https://docs.usebruno.com/get-started/import-export-data/postman-migration',
    testId: 'import-page-migrate-link'
  },
  {
    label: 'Learn more about importing',
    url: 'https://docs.usebruno.com/get-started/import-export-data/import-collections',
    testId: 'import-page-docs-link'
  }
];

const ImportPage = () => {
  const importFrom = useImportHandoff();
  const isLoading = useSelector((state) => state.openCollectionModal.importLoadId !== null);
  const [text, setText] = useState('');
  const [isDragOverZone, setIsDragOverZone] = useState(false);
  const fileInput = useRef(null);

  const trimmedText = text.trim();
  const isZipText = isZipUrl(trimmedText);

  const loadText = (value) => {
    if (value && !isZipUrl(value) && !isLoading) {
      importFrom(loadImportText(value));
    }
  };

  const submitText = (event) => {
    event.preventDefault();
    loadText(trimmedText);
  };

  const pasteText = (event) => {
    const pasted = event.clipboardData.getData('text').trim();
    if (!pasted || isLoading) {
      return;
    }
    event.preventDefault();
    setText(pasted);
    loadText(pasted);
  };

  const loadPickedFiles = (event) => {
    importFrom(loadImportFiles(Array.from(event.target.files)));
    event.target.value = '';
  };

  return (
    <StyledWrapper>
      <form onSubmit={submitText}>
        <div className="import-text-field">
          <IconLink size={15} strokeWidth={1.75} aria-hidden="true" />
          <input
            type="text"
            spellCheck={false}
            placeholder="Paste a URL or raw JSON/YAML"
            aria-label="Paste a URL or raw JSON/YAML"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onPaste={pasteText}
            readOnly={isLoading}
            data-testid="import-page-text"
          />
          {isLoading ? (
            <span className="import-text-status" role="status" aria-label="Loading" data-testid="import-page-loading">
              <IconLoader2 size={14} strokeWidth={2} className="import-text-spinner" aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </form>

      {isZipText ? (
        <div className="import-zip-warning" data-testid="import-page-zip-warning">
          <IconAlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
          <span>Bruno collection (.zip) from a URL · not supported yet. Download it and drop it here.</span>
        </div>
      ) : null}
      {trimmedText && !isZipText && !isLoading ? (
        <div className="import-enter-hint" data-testid="import-page-enter-hint">
          <kbd>Enter</kbd> to import
        </div>
      ) : null}

      <DropZone
        icon={IconUpload}
        iconSize={22}
        isDragOver={isDragOverZone}
        dragHandlers={{
          onDragEnter: (event) => setIsDragOverZone(isDraggingFiles(event)),
          onDragLeave: (event) => setIsDragOverZone(event.currentTarget.contains(event.relatedTarget)),
          onDrop: () => setIsDragOverZone(false)
        }}
        title="Drop anywhere to import"
        hint="Postman · Insomnia · OpenAPI · WSDL · OpenCollection · Bruno"
        data-testid="import-page-drop-zone"
      >
        Or{' '}
        <button
          type="button"
          className="text-link hover:underline whitespace-nowrap"
          onClick={() => fileInput.current.click()}
          data-testid="import-page-select-files"
        >
          select files
        </button>
      </DropZone>
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        onChange={loadPickedFiles}
        data-testid="import-page-file-input"
      />

      <div className="import-docs-links">
        {DOCS_LINKS.map(({ label, url, testId }) => (
          <button
            key={url}
            type="button"
            className="import-docs-link"
            onClick={() => window.ipcRenderer.openExternal(url)}
            data-testid={testId}
          >
            {label}
            <IconExternalLink size={13} strokeWidth={1.75} aria-hidden="true" />
          </button>
        ))}
      </div>
    </StyledWrapper>
  );
};

export default ImportPage;
