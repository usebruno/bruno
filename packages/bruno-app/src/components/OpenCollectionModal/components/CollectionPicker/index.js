import { useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import { Virtuoso } from 'react-virtuoso';
import { IconSearch, IconX } from '@tabler/icons';
import Button from 'ui/Button';
import { toPathKey } from 'providers/ReduxStore/slices/open-collection-modal/collection-paths';
import { countOf } from 'providers/ReduxStore/slices/open-collection-modal/folder-results';
import CollectionRow from './CollectionRow';
import { getLocationInFolders, tildify } from '../../utils/collection-location';
import { focusNextTabbable } from '../../utils/focus';
import StyledWrapper from './StyledWrapper';

const matchesSearch = (collection, query) =>
  [collection.name, collection.path, tildify(collection.path)].some((text) => text.toLowerCase().includes(query));

const ListItem = ({ children, item, context, ...props }) => (
  <div {...props} className={classnames('collection-picker-item', { 'is-last': props['data-index'] === context.lastIndex })}>
    {children}
  </div>
);

const Scroller = ({ tabIndex, context, ...props }) => <div {...props} />;

const NoMatch = ({ context }) => <p className="collection-picker-no-match">No collection matches “{context.searchText}”.</p>;

const CollectionPicker = ({
  collections,
  folders,
  initialSelection,
  openPathKeys,
  testIdPrefix,
  onOpen,
  onCancel,
  onChooseOtherFolders
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedKeys, setSelectedKeys] = useState(() => new Set(initialSelection.map(toPathKey)));
  const searchInput = useRef(null);

  const isOpen = (collection) => openPathKeys.has(toPathKey(collection.path));
  const query = searchText.trim().toLowerCase();

  const rows = useMemo(() => {
    const matches = query ? collections.filter((collection) => matchesSearch(collection, query)) : collections;
    const isAlreadyOpen = (collection) => openPathKeys.has(toPathKey(collection.path));
    return [...matches.filter((collection) => !isAlreadyOpen(collection)), ...matches.filter(isAlreadyOpen)];
  }, [collections, query, openPathKeys]);

  const visibleSelectableKeys = rows.filter((collection) => !isOpen(collection)).map((collection) => toPathKey(collection.path));
  const allVisibleSelected = visibleSelectableKeys.length > 0 && visibleSelectableKeys.every((key) => selectedKeys.has(key));
  const selectedPaths = collections
    .filter((collection) => selectedKeys.has(toPathKey(collection.path)) && !isOpen(collection))
    .map((collection) => collection.path);

  const toggleRow = (collection) => {
    const key = toPathKey(collection.path);
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

  const toggleAllVisible = () => {
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      visibleSelectableKeys.forEach((key) => {
        if (allVisibleSelected) {
          next.delete(key);
        } else {
          next.add(key);
        }
      });
      return next;
    });
  };

  const clearSearch = () => {
    setSearchText('');
    searchInput.current.focus();
  };

  const clearSelection = (event) => {
    focusNextTabbable(event.currentTarget);
    setSelectedKeys(new Set());
  };

  return (
    <StyledWrapper>
      <div className="collection-picker-search">
        <IconSearch size={15} strokeWidth={1.75} className="collection-picker-search-icon" aria-hidden="true" />
        <input
          ref={searchInput}
          type="text"
          placeholder="Search collections"
          aria-label="Search found collections"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          data-testid={`${testIdPrefix}-search`}
        />
        {searchText ? (
          <button
            type="button"
            className="collection-picker-search-clear"
            aria-label="Clear search"
            onClick={clearSearch}
            data-testid={`${testIdPrefix}-search-clear`}
          >
            <IconX size={12} strokeWidth={2.2} />
          </button>
        ) : null}
      </div>

      <div className="collection-picker-summary">
        <strong>
          {countOf(collections.length, 'collection')} in {folders.length === 1 ? tildify(folders[0]) : countOf(folders.length, 'folder')}
        </strong>
        {visibleSelectableKeys.length > 1 ? (
          <button
            type="button"
            className="text-link hover:underline whitespace-nowrap"
            onClick={toggleAllVisible}
            data-testid={`${testIdPrefix}-select-all`}
          >
            {allVisibleSelected ? 'Clear selection' : 'Select all'}
          </button>
        ) : null}
      </div>

      <div className="collection-picker-list" data-testid={`${testIdPrefix}-list`}>
        <Virtuoso
          className="h-full"
          data={rows}
          increaseViewportBy={600}
          context={{ searchText: searchText.trim(), lastIndex: rows.length - 1 }}
          computeItemKey={(_index, collection) => toPathKey(collection.path)}
          components={{ Scroller, Item: ListItem, EmptyPlaceholder: NoMatch }}
          itemContent={(_index, collection) => (
            <CollectionRow
              collection={collection}
              location={getLocationInFolders(folders, collection.path)}
              isOpen={isOpen(collection)}
              isSelected={selectedKeys.has(toPathKey(collection.path))}
              testIdPrefix={testIdPrefix}
              onToggle={() => toggleRow(collection)}
              onOpen={() => onOpen([collection.path])}
            />
          )}
        />
      </div>

      <div className="collection-picker-footer">
        <div className="collection-picker-footer-start">
          {selectedPaths.length > 0 ? (
            <>
              <span>{selectedPaths.length} selected</span>
              <button
                type="button"
                className="text-link hover:underline whitespace-nowrap"
                onClick={clearSelection}
                data-testid={`${testIdPrefix}-clear-selection`}
              >
                Clear
              </button>
            </>
          ) : (
            <button
              type="button"
              className="text-link hover:underline whitespace-nowrap"
              onClick={onChooseOtherFolders}
              data-testid={`${testIdPrefix}-choose-other`}
            >
              Choose other folders…
            </button>
          )}
        </div>
        <div className="collection-picker-actions">
          <Button variant="ghost" color="secondary" onClick={onCancel} data-testid={`${testIdPrefix}-cancel`}>
            Cancel
          </Button>
          <Button
            color="primary"
            disabled={selectedPaths.length === 0}
            onClick={() => onOpen(selectedPaths)}
            data-testid={`${testIdPrefix}-open-selected`}
          >
            {selectedPaths.length > 0 ? `Open ${countOf(selectedPaths.length, 'collection')}` : 'Open'}
          </Button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CollectionPicker;
