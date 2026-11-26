import { useCallback, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import { Virtuoso } from 'react-virtuoso';
import { IconFolder, IconSearch, IconX } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import Button from 'ui/Button';
import Checkbox from 'ui/Checkbox';
import { toPathKey } from 'providers/ReduxStore/slices/open-collection-modal/collection-paths';
import { countOf } from 'providers/ReduxStore/slices/open-collection-modal/folder-results';
import NoMatch from '../NoMatch';
import CollectionListRow from './CollectionListRow';
import { tildify } from '../../utils/collection-location';
import { focusWhenFocusIsLost } from '../../utils/focus';
import StyledWrapper from './StyledWrapper';

const matchesSearch = (collection, query) =>
  [collection.name, collection.path, tildify(collection.path)].some((text) => text.toLowerCase().includes(query));

const ListItem = ({ children, item, context, ...props }) => (
  <div {...props} className={classnames('collection-list-item', { 'is-last': props['data-index'] === context.lastIndex })}>
    {children}
  </div>
);

const Scroller = ({ tabIndex, context, ...props }) => <div {...props} />;

const ListEmpty = ({ context }) => context.empty;

const ListFooter = ({ context }) => context.footer;

const NO_PATH_KEYS = new Set();

const describeHiddenCollections = (hiddenCount, showHidden) => {
  if (showHidden) {
    return 'Showing collections already open in this workspace.';
  }
  return `${countOf(hiddenCount, 'collection')} already open in this workspace ${hiddenCount === 1 ? 'isn’t' : 'aren’t'} shown.`;
};

const CollectionList = ({
  collections,
  openPathKeys,
  hiddenPathKeys = NO_PATH_KEYS,
  initialSelectedPaths = [],
  getMeta = () => null,
  searchPlaceholder = 'Search collections',
  autoFocusSearch = true,
  showSelectAll = false,
  banner = null,
  emptyText = null,
  noMatchText,
  showChooseFolderNextToSearch = true,
  testIdPrefix,
  onChooseFolder,
  onOpen,
  onSwitch,
  onCancel
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedKeys, setSelectedKeys] = useState(() => new Set(initialSelectedPaths.map(toPathKey)));
  const [showHidden, setShowHidden] = useState(false);
  const searchInput = useRef(null);
  const virtuoso = useRef(null);
  const rowsElement = useRef(null);
  const rangeAnchorKey = useRef(null);

  const isOpen = (collection) => openPathKeys.has(toPathKey(collection.path));
  const isHidden = useCallback((collection) => hiddenPathKeys.has(toPathKey(collection.path)), [hiddenPathKeys]);
  const query = searchText.trim().toLowerCase();

  const matches = useMemo(
    () => (query ? collections.filter((collection) => matchesSearch(collection, query)) : collections),
    [collections, query]
  );
  const hiddenCount = matches.filter(isHidden).length;
  const rows = useMemo(
    () => (showHidden ? matches : matches.filter((collection) => !isHidden(collection))),
    [matches, showHidden, isHidden]
  );
  const hasNoMatch = query !== '' && rows.length === 0;

  const selectedPaths = collections
    .filter((collection) => selectedKeys.has(toPathKey(collection.path)) && !isOpen(collection))
    .map((collection) => collection.path);

  const selectableRowKeys = rows.filter((row) => !isOpen(row)).map((row) => toPathKey(row.path));
  const selectedRowCount = selectableRowKeys.filter((key) => selectedKeys.has(key)).length;
  const areAllRowsSelected = selectableRowKeys.length > 0 && selectedRowCount === selectableRowKeys.length;

  const focusSearchWhenRemovedWithFocus = useCallback((element) => () => {
    if (element.contains(document.activeElement)) {
      queueMicrotask(() => focusWhenFocusIsLost(searchInput.current));
    }
  }, []);

  const toggleRow = (collection, event) => {
    const key = toPathKey(collection.path);
    const rowKeys = rows.map((row) => toPathKey(row.path));
    const anchorIndex = rowKeys.indexOf(rangeAnchorKey.current);
    const index = rowKeys.indexOf(key);
    rangeAnchorKey.current = key;

    if (event.shiftKey && anchorIndex !== -1 && anchorIndex !== index) {
      const rangeKeys = rows
        .slice(Math.min(anchorIndex, index), Math.max(anchorIndex, index) + 1)
        .filter((row) => !isOpen(row))
        .map((row) => toPathKey(row.path));
      setSelectedKeys((previous) => new Set([...previous, ...rangeKeys]));
      return;
    }

    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const focusRow = (index) => {
    if (index < 0 || index >= rows.length) {
      return;
    }
    virtuoso.current.scrollIntoView({
      index,
      done: () => rowsElement.current.querySelector(`[data-index="${index}"] input, [data-index="${index}"] button`)?.focus({ preventScroll: true })
    });
  };

  const toggleAllRows = () => {
    setSelectedKeys((previous) => {
      if (!areAllRowsSelected) {
        return new Set([...previous, ...selectableRowKeys]);
      }
      const rowKeys = new Set(selectableRowKeys);
      return new Set([...previous].filter((key) => !rowKeys.has(key)));
    });
  };

  const clearSearch = () => {
    setSearchText('');
    searchInput.current.focus();
  };

  return (
    <StyledWrapper>
      <div className="collection-list-search-row">
        <div className="collection-list-search">
          <IconSearch size={14} strokeWidth={1.5} aria-hidden="true" />
          <input
            ref={searchInput}
            type="text"
            placeholder={searchPlaceholder}
            aria-label="Search collections"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            autoFocus={autoFocusSearch}
            data-focus-on-show={autoFocusSearch || undefined}
            data-testid={`${testIdPrefix}-search`}
          />
          {searchText && (
            <ActionIcon
              type="button"
              size="sm"
              className="collection-list-search-clear"
              aria-label="Clear search"
              onClick={clearSearch}
              data-testid={`${testIdPrefix}-search-clear`}
            >
              <IconX size={14} strokeWidth={1.5} />
            </ActionIcon>
          )}
        </div>
        {showSelectAll && (
          <Checkbox
            className="collection-list-select-all"
            checked={areAllRowsSelected}
            indeterminate={selectedRowCount > 0 && !areAllRowsSelected}
            disabled={selectableRowKeys.length === 0}
            onChange={toggleAllRows}
            label="Select all"
            data-testid={`${testIdPrefix}-select-all`}
          />
        )}
        {onChooseFolder && showChooseFolderNextToSearch && (
          <Button
            size="sm"
            color="secondary"
            className="collection-list-choose-folder"
            icon={<IconFolder size={14} strokeWidth={1.75} />}
            onClick={onChooseFolder}
            data-testid={`${testIdPrefix}-choose-folder`}
          >
            Choose folder
          </Button>
        )}
      </div>

      {banner}

      <div ref={rowsElement} className="collection-list-rows" data-testid={`${testIdPrefix}-list`}>
        <Virtuoso
          ref={virtuoso}
          className="h-full"
          data={rows}
          increaseViewportBy={600}
          context={{
            lastIndex: rows.length - 1,
            empty: query ? (
              <NoMatch
                query={searchText.trim()}
                action={onChooseFolder && (
                  <Button
                    variant="outline"
                    color="secondary"
                    icon={<IconFolder size={15} strokeWidth={1.75} />}
                    onClick={onChooseFolder}
                    data-testid={`${testIdPrefix}-no-match-choose-folder`}
                  >
                    Choose folder
                  </Button>
                )}
                data-testid={`${testIdPrefix}-no-match`}
              >
                {noMatchText}
              </NoMatch>
            ) : emptyText && (
              <p className="collection-list-empty" data-testid={`${testIdPrefix}-list-empty`}>
                {emptyText}
              </p>
            ),
            footer: hiddenCount > 0 ? (
              <p className="collection-list-open-line" data-testid={`${testIdPrefix}-open-line`}>
                {describeHiddenCollections(hiddenCount, showHidden)}{' '}
                <button
                  type="button"
                  className="collection-list-open-toggle"
                  onClick={() => setShowHidden(!showHidden)}
                  data-testid={`${testIdPrefix}-open-toggle`}
                >
                  {showHidden ? 'Hide' : 'Show'}
                </button>
              </p>
            ) : null
          }}
          computeItemKey={(_index, collection) => toPathKey(collection.path)}
          components={{ Scroller, Item: ListItem, EmptyPlaceholder: ListEmpty, Footer: ListFooter }}
          itemContent={(index, collection) => (
            <CollectionListRow
              collection={collection}
              meta={getMeta(collection)}
              isOpen={isOpen(collection)}
              isSelected={selectedKeys.has(toPathKey(collection.path))}
              isSelecting={selectedPaths.length > 0}
              rowRef={focusSearchWhenRemovedWithFocus}
              testIdPrefix={testIdPrefix}
              onToggle={(event) => toggleRow(collection, event)}
              onOpen={() => onOpen([collection.path])}
              onSwitch={() => onSwitch(collection.path)}
              onMoveFocus={(step) => focusRow(index + step)}
            />
          )}
        />
      </div>

      {selectedPaths.length > 0 && !hasNoMatch && (
        <div ref={focusSearchWhenRemovedWithFocus} className="collection-list-footer">
          <Button variant="ghost" color="secondary" onClick={onCancel} data-testid={`${testIdPrefix}-cancel`}>
            Cancel
          </Button>
          <Button color="primary" onClick={() => onOpen(selectedPaths)} data-testid={`${testIdPrefix}-open-selected`}>
            {`Open ${countOf(selectedPaths.length, 'collection')}`}
          </Button>
        </div>
      )}
    </StyledWrapper>
  );
};

export default CollectionList;
