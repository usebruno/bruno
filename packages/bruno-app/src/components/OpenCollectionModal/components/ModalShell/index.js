import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Portal from 'components/Portal';
import useKeybinding from 'hooks/useKeybinding';
import { folderNoteDismissed } from 'providers/ReduxStore/slices/open-collection-modal';
import {
  addFolderResultToSearch,
  closeOpenCollectionModal,
  loadImportableFile,
  openCollectionModal,
  openDroppedItems
} from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { OPEN_COLLECTION_PAGE } from 'utils/common/constants';
import { findOpenCollectionPage } from '../../sidebar/pages';
import BusyOverlay from '../BusyOverlay';
import DropOverlay from '../DropOverlay';
import { useImportHandoff } from '../ImportHandoff/context';
import ModalMenu from '../../sidebar/ModalMenu';
import Note from '../Note';
import PageHeader from '../PageHeader';
import { focusNextTabbable, focusWhenFocusIsLost, getTabbableElements } from '../../utils/focus';
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
  const dialogRef = useRef(null);
  const hostSlot = useRef(null);
  const isAddingToSearchRef = useRef(false);
  const pageId = useSelector((state) => state.openCollectionModal.page);
  const isOpening = useSelector((state) => state.openCollectionModal.openingId !== null);
  const note = useSelector((state) => state.openCollectionModal.chooseFolder.result?.note);
  const foldersToAdd = useSelector((state) => {
    const { result } = state.openCollectionModal.chooseFolder;
    return result?.addedToSearch ? undefined : result?.folders;
  });
  const page = findOpenCollectionPage(pageId);
  const hostPage = page.parent ? findOpenCollectionPage(page.parent) : page;
  const Page = page.component;
  const Subtitle = page.subtitle;
  const [showDropOverlay, setShowDropOverlay] = useState(false);
  const [visitedPageIds, setVisitedPageIds] = useState(() => [hostPage.id]);
  if (!visitedPageIds.includes(hostPage.id)) {
    setVisitedPageIds([...visitedPageIds, hostPage.id]);
  }

  useEffect(() => {
    const focusTarget = hostSlot.current.querySelector('[data-focus-on-show]');
    if (focusTarget) {
      focusTarget.focus();
    } else {
      focusWhenFocusIsLost(getTabbableElements(hostSlot.current)[0]);
    }
  }, [hostPage.id]);

  const close = () => dispatch(closeOpenCollectionModal());

  const showPageFromShortcut = (pageId, options) => {
    dispatch(openCollectionModal(pageId, options));
    queueMicrotask(() => focusWhenFocusIsLost(getTabbableElements(hostSlot.current)[0]));
    return false;
  };

  useKeybinding('importCollection', () => showPageFromShortcut(OPEN_COLLECTION_PAGE.IMPORT), { scopeRef: dialogRef });
  useKeybinding('openCollection', () => showPageFromShortcut(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, { pickFolders: true }), { scopeRef: dialogRef });

  const goBack = () => {
    dispatch(openCollectionModal(page.parent));
    queueMicrotask(() => focusWhenFocusIsLost(getTabbableElements(hostSlot.current)[0]));
  };

  const addFoldersToSearch = (event) => {
    focusNextTabbable(event.currentTarget);
    if (isAddingToSearchRef.current) {
      return;
    }
    isAddingToSearchRef.current = true;
    dispatch(addFolderResultToSearch()).finally(() => {
      isAddingToSearchRef.current = false;
    });
  };

  const getNoteAction = () => {
    if (note.importFile) {
      return { label: 'Import it', onClick: () => importFrom(loadImportableFile(note.importFile)) };
    }
    if (foldersToAdd) {
      return { label: 'Add to search locations', onClick: addFoldersToSearch };
    }
    return null;
  };

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
    dialogRef.current = dialog;
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
          <ModalMenu titleId={TITLE_ID} activePageId={hostPage.id} />
          <div className="modal-main">
            <PageHeader
              title={page.title}
              description={Subtitle ? <Subtitle /> : page.description}
              onBack={page.parent ? goBack : undefined}
              onClose={close}
            />
            {note && (
              <Note
                tone={note.tone}
                action={getNoteAction()}
                onDismiss={() => dispatch(folderNoteDismissed())}
              >
                {note.text}
              </Note>
            )}
            <div className="modal-page" data-testid={`open-collection-page-${page.id}`}>
              <div className="modal-page-content" inert={isOpening}>
                {visitedPageIds.map((visitedPageId) => {
                  const visitedPage = findOpenCollectionPage(visitedPageId);
                  const VisitedPage = visitedPage.component;
                  const isHostPage = visitedPage === hostPage;
                  return (
                    <div
                      key={visitedPage.id}
                      ref={isHostPage ? hostSlot : undefined}
                      className="modal-page-slot"
                      hidden={!isHostPage || hostPage !== page}
                    >
                      <VisitedPage />
                    </div>
                  );
                })}
                {hostPage !== page && <Page />}
              </div>
              {isOpening && <BusyOverlay>Opening…</BusyOverlay>}
            </div>
          </div>
          {showDropOverlay && !isOpening && <DropOverlay />}
        </div>
      </StyledWrapper>
    </Portal>
  );
};

export default ModalShell;
