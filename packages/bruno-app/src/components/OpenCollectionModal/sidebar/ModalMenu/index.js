import classnames from 'classnames';
import { IconLoader2 } from '@tabler/icons';
import { useDispatch, useSelector } from 'react-redux';
import { openCollectionModal } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { OPEN_COLLECTION_PAGES } from '../pages';
import { GIT_PAGE_ID } from '../GitPage/constants';
import StyledWrapper from './StyledWrapper';

const SOURCES_LABEL_ID = 'open-collection-sources-label';

const moveFocus = (event) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
    return;
  }
  const items = Array.from(event.currentTarget.querySelectorAll('.menu-item'));
  const index = items.indexOf(document.activeElement);
  if (index === -1) {
    return;
  }
  event.preventDefault();
  const step = event.key === 'ArrowDown' ? 1 : -1;
  items[(index + step + items.length) % items.length].focus();
};

const ModalMenu = ({ titleId, activePageId }) => {
  const dispatch = useDispatch();
  const isPageBusy = useSelector((state) => state.openCollectionModal.pageBusy);
  const topPages = OPEN_COLLECTION_PAGES.filter((page) => page.group !== 'sources');
  const sourcePages = OPEN_COLLECTION_PAGES.filter((page) => page.group === 'sources');

  const renderItem = ({ id, label, icon: Icon }) => {
    const isActive = id === activePageId;
    const isWorking = id === GIT_PAGE_ID && isPageBusy;
    return (
      <button
        key={id}
        type="button"
        className={classnames('menu-item', { active: isActive })}
        aria-current={isActive ? 'page' : undefined}
        aria-busy={isWorking || undefined}
        onClick={() => dispatch(openCollectionModal(id))}
        data-testid={`open-collection-menu-item-${id}`}
      >
        {isWorking ? (
          <IconLoader2 className="animate-spin" size={16} strokeWidth={1.75} aria-hidden="true" data-testid={`open-collection-menu-item-${id}-spinner`} />
        ) : (
          <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
        )}
        <span className="menu-item-label">{label}</span>
      </button>
    );
  };

  return (
    <StyledWrapper aria-labelledby={titleId} onKeyDown={moveFocus} data-testid="open-collection-menu">
      <h2 id={titleId}>Open collection</h2>
      {topPages.map(renderItem)}
      <div className="menu-section" role="group" aria-labelledby={SOURCES_LABEL_ID}>
        <span id={SOURCES_LABEL_ID} className="menu-section-label">
          Sources
        </span>
        {sourcePages.map(renderItem)}
      </div>
    </StyledWrapper>
  );
};

export default ModalMenu;
