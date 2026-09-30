import React from 'react';
import StyledWrapper from './StyledWrapper';
import Button from 'ui/Button';

/**
 * A single row inside a ListGroup.
 *
 * Owns the row chrome (hover background, dividers, action reveal-on-hover) and
 * exposes three slots so each feature supplies its own content:
 *   - leading:  optional element shown at the start of the row (e.g. an icon)
 *   - children: the row body — arbitrary per-feature content
 *   - actions:  optional trailing controls (e.g. a toggle, a delete button)
 *
 * `disabled` dims the leading + body slots (not the actions, so controls stay usable).
 */
const ListGroupItem = ({ leading, actions, disabled = false, className = '', children, ...rest }) => {
  return (
    <li className={['listgroup-item', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ')} {...rest}>
      {leading != null ? <div className="listgroup-item-leading">{leading}</div> : null}
      <div className="listgroup-item-body">{children}</div>
      {actions != null ? <div className="listgroup-item-actions">{actions}</div> : null}
    </li>
  );
};

/**
 * Presentational list shell. Owns the repeated chrome — bordered container,
 * empty state, and add-button placement — while each feature renders its own
 * rows via `renderItem` (returning a `ListGroup.Item`).
 *
 * Intentionally stateless: no data fetching, forms, or persistence live here.
 *
 * @param {Array}    items      - rows to render
 * @param {Function} renderItem - (item, index) => <ListGroup.Item .../>
 * @param {Function} [getKey]   - (item, index) => key; defaults to index
 * @param {Object}   [emptyState] - { icon, title, text } shown when items is empty
 * @param {Object}   [addButton]  - { label, onClick, icon, dataTestId } action button
 * @param {ReactNode} [footerActions] - extra controls placed alongside the add button (e.g. a Save button)
 * @param {number|string} [maxWidth=800] - width cap for the list/empty frame; a number is treated as px
 */
const ListGroup = ({
  items = [],
  renderItem,
  getKey,
  emptyState,
  addButton,
  footerActions,
  className = '',
  maxWidth = 800
}) => {
  const hasItems = items.length > 0;
  const resolvedMaxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;

  const renderAddButton = () =>
    addButton ? (
      <Button size="sm" icon={addButton.icon} onClick={addButton.onClick} data-testid={addButton.dataTestId}>
        {addButton.label}
      </Button>
    ) : null;

  return (
    <StyledWrapper className={className} $maxWidth={resolvedMaxWidth}>
      {!hasItems && emptyState ? (
        <div className="listgroup-empty">
          {emptyState.icon ? <div className="listgroup-empty-icon">{emptyState.icon}</div> : null}
          {emptyState.title ? <div className="listgroup-empty-title">{emptyState.title}</div> : null}
          {emptyState.text ? <div className="listgroup-empty-text">{emptyState.text}</div> : null}
          {addButton ? <div className="listgroup-empty-action">{renderAddButton()}</div> : null}
        </div>
      ) : null}

      {hasItems ? (
        <ul className="listgroup">
          {items.map((item, index) => (
            <React.Fragment key={getKey ? getKey(item, index) : index}>{renderItem(item, index)}</React.Fragment>
          ))}
        </ul>
      ) : null}

      {/* the add button lives inside the empty frame when there are no rows, so the footer only carries it once rows exist */}
      {(hasItems && addButton) || footerActions ? (
        <div className="listgroup-footer">
          {hasItems ? renderAddButton() : null}
          {footerActions}
        </div>
      ) : null}
    </StyledWrapper>
  );
};

ListGroup.Item = ListGroupItem;

export default ListGroup;
