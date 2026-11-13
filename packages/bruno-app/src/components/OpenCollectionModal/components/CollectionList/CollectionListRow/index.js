import classnames from 'classnames';
import { IconBox } from '@tabler/icons';
import Button from 'ui/Button';
import Checkbox from 'ui/Checkbox';
import { formatParentPath } from './utils';
import StyledWrapper from './StyledWrapper';

const removeFromTabOrder = (checkbox) => {
  if (checkbox) {
    checkbox.tabIndex = -1;
  }
};

const keepTextUnselectedOnShiftClick = (event) => {
  if (event.shiftKey) {
    event.preventDefault();
  }
};

const CollectionListRow = ({
  collection,
  meta,
  isOpen,
  isSelected,
  isSelecting,
  rowRef,
  testIdPrefix,
  onToggle,
  onOpen,
  onSwitch,
  onMoveFocus
}) => {
  const openOrSwitch = isOpen ? onSwitch : onOpen;

  const handleKeyDown = (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      onMoveFocus(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === ' ') {
      event.preventDefault();
      if (!isOpen) {
        onToggle(event);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      openOrSwitch();
    }
  };

  const pressAction = (event) => {
    event.stopPropagation();
    openOrSwitch();
  };

  return (
    <StyledWrapper
      ref={rowRef}
      className={classnames('collection-list-row', { 'is-open': isOpen, 'is-selecting': isSelecting })}
      tabIndex={0}
      onMouseDown={keepTextUnselectedOnShiftClick}
      onClick={isOpen ? undefined : onToggle}
      onKeyDown={handleKeyDown}
      data-testid={`${testIdPrefix}-row`}
    >
      <span className="collection-list-row-lead">
        <span className="collection-list-row-icon" aria-hidden="true">
          <IconBox size={15} strokeWidth={1.75} />
        </span>
        {!isOpen && (
          <span className="collection-list-row-checkbox">
            <Checkbox ref={removeFromTabOrder} checked={isSelected} onChange={() => {}} ariaLabel={`Select ${collection.name}`} />
          </span>
        )}
      </span>
      <span className="collection-list-row-main">
        <span className="collection-list-row-name" title={collection.name} data-testid={`${testIdPrefix}-row-name`}>
          {collection.name}
        </span>
        <span className="collection-list-row-path" title={collection.path} data-testid={`${testIdPrefix}-row-path`}>
          {formatParentPath(collection.path, collection.name)}
        </span>
      </span>
      <span className="collection-list-row-end">
        <span className="collection-list-row-meta" data-testid={`${testIdPrefix}-row-meta`}>{meta}</span>
        <Button
          size="sm"
          color="secondary"
          className="collection-list-row-action"
          onClick={pressAction}
          aria-label={isOpen ? `Switch to ${collection.name}` : `Open ${collection.name}`}
          data-testid={isOpen ? `${testIdPrefix}-row-switch` : `${testIdPrefix}-row-open`}
        >
          {isOpen ? 'Switch' : 'Open'}
        </Button>
      </span>
    </StyledWrapper>
  );
};

export default CollectionListRow;
