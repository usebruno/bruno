import { useCallback, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import { Virtuoso } from 'react-virtuoso';
import { IconFolder, IconSearch, IconX } from '@tabler/icons';
import Button from 'ui/Button';
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

const ListNoMatch = ({ context }) => context.noMatch;

const CollectionList = ({
  collections,
  openPathKeys,
  getMeta,
  noMatchText,
  testIdPrefix,
  onChooseFolder,
  onOpen,
  onSwitch,
  onCancel
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const searchInput = useRef(null);
  const virtuoso = useRef(null);
  const rowsElement = useRef(null);
  const rangeAnchorKey = useRef(null);

  const isOpen = useCallback((collection) => openPathKeys.has(toPathKey(collection.path)), [openPathKeys]);
  const query = searchText.trim().toLowerCase();

  const rows = useMemo(() => {
    const matches = query ? collections.filter((collection) => matchesSearch(collection, query)) : collections;
    return [...matches.filter((collection) => !isOpen(collection)), ...matches.filter(isOpen)];
  }, [collections, query, isOpen]);

  const selectedPaths = collections
    .filter((collection) => selectedKeys.has(toPathKey(collection.path)) && !isOpen(collection))
    .map((collection) => collection.path);

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
      const rangeKeys = rowKeys.slice(Math.min(anchorIndex, index), Math.max(anchorIndex, index) + 1);
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

  const clearSearch = () => {
    setSearchText('');
    searchInput.current.focus();
  };

  const renderChooseFolderButton = (color, testId) => (
    <Button
      size="sm"
      color={color}
      className="collection-list-choose-folder"
      icon={<IconFolder size={14} strokeWidth={1.75} />}
      title="Choose a collection folder to open it in place"
      onClick={onChooseFolder}
      data-testid={testId}
    >
      Choose folder…
    </Button>
  );

  return (
    <StyledWrapper>
      <div className="collection-list-search-row">
        <div className="collection-list-search">
          <IconSearch size={15} strokeWidth={1.75} aria-hidden="true" />
          <input
            ref={searchInput}
            type="text"
            placeholder="Search collections"
            aria-label="Search collections"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            autoFocus
            data-testid={`${testIdPrefix}-search`}
          />
          {searchText && (
            <button
              type="button"
              className="collection-list-search-clear"
              aria-label="Clear search"
              onClick={clearSearch}
              data-testid={`${testIdPrefix}-search-clear`}
            >
              <IconX size={12} strokeWidth={2.2} />
            </button>
          )}
        </div>
        <span className="collection-list-search-or">or</span>
        {renderChooseFolderButton('secondary', `${testIdPrefix}-choose-folder`)}
      </div>

      <div ref={rowsElement} className="collection-list-rows" data-testid={`${testIdPrefix}-list`}>
        <Virtuoso
          ref={virtuoso}
          className="h-full"
          data={rows}
          increaseViewportBy={600}
          context={{
            lastIndex: rows.length - 1,
            noMatch: (
              <NoMatch
                query={searchText.trim()}
                action={renderChooseFolderButton('primary', `${testIdPrefix}-no-match-choose-folder`)}
                data-testid={`${testIdPrefix}-no-match`}
              >
                {noMatchText}
              </NoMatch>
            )
          }}
          computeItemKey={(_index, collection) => toPathKey(collection.path)}
          components={{ Scroller, Item: ListItem, EmptyPlaceholder: ListNoMatch }}
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

      {selectedPaths.length > 0 && (
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
