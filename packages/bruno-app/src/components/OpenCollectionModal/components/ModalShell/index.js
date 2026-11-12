import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Portal from 'components/Portal';
import { folderNoteDismissed } from 'providers/ReduxStore/slices/open-collection-modal';
import { closeOpenCollectionModal, loadImportableFile, openDroppedItems } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { OPEN_COLLECTION_PAGES } from '../../sidebar/pages';
import BusyOverlay from '../BusyOverlay';
import DropOverlay from '../DropOverlay';
import { useImportHandoff } from '../ImportHandoff/context';
import ModalMenu from '../../sidebar/ModalMenu';
import Note from '../Note';
import PageHeader from '../PageHeader';
import { getTabbableElements } from '../../utils/focus';
import { isDraggingFiles, readDroppedItems } from '../../utils/dropped-items';
import StyledWrapper from './StyledWrapper';

const TITLE_ID = 'open-collection-modal-title';

const keepTabInside = (dialog, event) => {
  const tabbable = getTabbableElements(dialog);
  const first = tabbable[0];
  const last = tabbable[tabbable.length - 1];
  const focused = document.activeElement;
  if (!dialog.contains(focused) || focused === dialog) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && focused === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && focused === last) {
    event.preventDefault();
    first.focus();
  }
};

const ModalShell = () => {
  const dispatch = useDispatch();
  const importFrom = useImportHandoff();
  const [opener] = useState(() => document.activeElement);
  const pageId = useSelector((state) => state.openCollectionModal.page);
  const isOpening = useSelector((state) => state.openCollectionModal.openingId !== null);
  const note = useSelector((state) => state.openCollectionModal.chooseFolder.result?.note);
  const page = OPEN_COLLECTION_PAGES.find(({ id }) => id === pageId) || OPEN_COLLECTION_PAGES[0];
  const Page = page.component;
  const [showDropOverlay, setShowDropOverlay] = useState(false);

  const close = () => dispatch(closeOpenCollectionModal());

  const handleDragEnter = (event) => {
    event.preventDefault();
    if (isDraggingFiles(event)) {
      setShowDropOverlay(true);
    }
  };

  const handleDragOver = (event) => {
    if (!isDraggingFiles(event)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setShowDropOverlay(false);
    }
  };

  const handleDrop = (event) => {
    if (!isDraggingFiles(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setShowDropOverlay(false);
    importFrom(openDroppedItems(readDroppedItems(event.dataTransfer, window.ipcRenderer.getFilePath)));
  };

  const attachDialog = useCallback((dialog) => {
    if (!dialog.contains(document.activeElement)) {
      dialog.focus();
    }
    let lastFocused = document.activeElement;

    const isInAnotherDialog = (element) => !dialog.contains(element) && element.closest('[role="dialog"]') !== null;

    const handleFocusIn = (event) => {
      if (dialog.contains(event.target)) {
        lastFocused = event.target;
      } else if (!isInAnotherDialog(event.target)) {
        (lastFocused.isConnected ? lastFocused : dialog).focus();
      }
    };

    const handleKeyDown = (event) => {
      if (isInAnotherDialog(event.target)) {
        return;
      }
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        dispatch(closeOpenCollectionModal());
      } else if (event.key === 'Tab') {
        keepTabInside(dialog, event);
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('keydown', handleKeyDown);
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus();
      }
    };
  }, [dispatch, opener]);

  return (
    <Portal>
      <StyledWrapper>
        <div className="modal-backdrop" onClick={close} data-testid="open-collection-backdrop" />
        <div
          ref={attachDialog}
          className="modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby={TITLE_ID}
          tabIndex={-1}
          data-testid="open-collection-modal"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <ModalMenu titleId={TITLE_ID} activePageId={page.id} />
          <div className="modal-main">
            <PageHeader title={page.title} description={page.description} onClose={close} />
            {note ? (
              <Note
                tone={note.tone}
                action={note.importFile ? { label: 'Import it', onClick: () => importFrom(loadImportableFile(note.importFile)) } : null}
                onDismiss={() => dispatch(folderNoteDismissed())}
              >
                {note.text}
              </Note>
            ) : null}
            <div className="modal-page" data-testid={`open-collection-page-${page.id}`}>
              <div className="modal-page-content" inert={isOpening}>
                <Page />
              </div>
              {isOpening ? <BusyOverlay>Opening…</BusyOverlay> : null}
            </div>
          </div>
          {showDropOverlay && !isOpening ? <DropOverlay /> : null}
        </div>
      </StyledWrapper>
    </Portal>
  );
};

export default ModalShell;
