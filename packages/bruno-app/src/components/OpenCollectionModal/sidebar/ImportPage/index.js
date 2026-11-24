import { useRef, useState } from 'react';
import classnames from 'classnames';
import { useSelector } from 'react-redux';
import { IconAlertTriangle, IconCheck, IconLink, IconUpload } from '@tabler/icons';
import Button from 'ui/Button';
import { loadImportFiles, loadImportText } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import DropZone from '../../components/DropZone';
import { useImportHandoff } from '../../components/ImportHandoff/context';
import { isDraggingFiles } from '../../utils/dropped-items';
import StyledWrapper from './StyledWrapper';
import { describeImportText } from './utils';

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

const ImportPage = () => {
  const importFrom = useImportHandoff();
  const isLoading = useSelector((state) => state.openCollectionModal.importLoadId !== null);
  const [text, setText] = useState('');
  const [isDragOverZone, setIsDragOverZone] = useState(false);
  const fileInput = useRef(null);

  const trimmedText = text.trim();
  const hint = trimmedText ? describeImportText(trimmedText) : null;
  const isLoadDisabled = !trimmedText || hint.isWarning;

  const loadText = (event) => {
    event.preventDefault();
    importFrom(loadImportText(trimmedText));
  };

  const loadOnEnter = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    if (!isLoadDisabled && !isLoading) {
      importFrom(loadImportText(trimmedText));
    }
  };

  const loadPickedFiles = (event) => {
    importFrom(loadImportFiles(Array.from(event.target.files)));
    event.target.value = '';
  };

  return (
    <StyledWrapper>
      <form className="import-url-row" onSubmit={loadText}>
        <div className="import-url-field">
          <IconLink size={15} strokeWidth={1.75} aria-hidden="true" />
          <textarea
            rows={1}
            wrap="off"
            placeholder="Paste a file URL, e.g. https://example.com/openapi.yaml"
            aria-label="Paste a file URL"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={loadOnEnter}
            readOnly={isLoading}
            data-testid="import-page-text"
          />
        </div>
        <Button
          className="import-url-load"
          type="submit"
          size="sm"
          color="secondary"
          disabled={isLoadDisabled}
          loading={isLoading}
          data-testid="import-page-load"
        >
          Load
        </Button>
      </form>

      {hint ? (
        <div className={classnames('import-message', hint.isWarning ? 'is-warning' : 'is-ok')} data-testid="import-page-hint">
          {hint.isWarning ? <IconAlertTriangle size={14} strokeWidth={2} /> : <IconCheck size={14} strokeWidth={2} />}
          <span>{hint.text}</span>
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
        hint="OpenCollection · Bruno · Postman · Insomnia · OpenAPI · WSDL"
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
    </StyledWrapper>
  );
};

export default ImportPage;
