import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Portal from 'components/Portal';
import { hideOpenCollectionModal } from 'providers/ReduxStore/slices/open-collection-modal';
import { OPEN_COLLECTION_PAGES } from '../pages';
import ModalMenu from '../ModalMenu';
import PageHeader from '../PageHeader';
import StyledWrapper from './StyledWrapper';

const TITLE_ID = 'open-collection-modal-title';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]'
].join(', ');

const isTabbable = (element) => element.tabIndex >= 0 && element.checkVisibility();

const keepTabInside = (dialog, event) => {
  const tabbable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isTabbable);
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
  const [opener] = useState(() => document.activeElement);
  const pageId = useSelector((state) => state.openCollectionModal.page);
  const page = OPEN_COLLECTION_PAGES.find(({ id }) => id === pageId) || OPEN_COLLECTION_PAGES[0];
  const Page = page.component;

  const close = () => dispatch(hideOpenCollectionModal());

  const attachDialog = useCallback((dialog) => {
    dialog.querySelector('[aria-current="page"]').focus();

    const handleKeyDown = (event) => {
      const focusIsLost = event.target === document.body;
      if (!focusIsLost && !dialog.contains(event.target)) {
        return;
      }
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        dispatch(hideOpenCollectionModal());
      } else if (event.key === 'Tab') {
        keepTabInside(dialog, event);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
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
        >
          <ModalMenu titleId={TITLE_ID} activePageId={page.id} />
          <div className="modal-main">
            <PageHeader title={page.title} description={page.description} onClose={close} />
            <div className="modal-page" data-testid={`open-collection-page-${page.id}`}>
              <Page />
            </div>
          </div>
        </div>
      </StyledWrapper>
    </Portal>
  );
};

export default ModalShell;
