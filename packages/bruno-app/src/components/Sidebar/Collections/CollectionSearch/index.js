import { IconSearch, IconX, IconLoader2 } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const CollectionSearch = ({ searchText, setSearchText, indexing, matchCount }) => {
  return (
    <StyledWrapper>
      <div className="search-input-wrap">
        <IconSearch size={14} strokeWidth={1.5} className="search-icon" />
        <input
          type="text"
          name="search"
          data-testid="sidebar-search-input"
          placeholder="Search requests..."
          id="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          autoFocus
          spellCheck="false"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value.toLowerCase())}
        />
        {searchText !== '' && indexing && (
          <IconLoader2
            className="animate-spin indexing-icon with-clear"
            size={18}
            strokeWidth={1.5}
            data-testid="sidebar-search-indexing"
          />
        )}
        {searchText !== '' && (
          <div className="clear-icon" data-testid="sidebar-search-clear-icon" onClick={() => setSearchText('')}>
            <IconX size={14} strokeWidth={1.5} />
          </div>
        )}
      </div>
      {searchText !== '' && matchCount != null && (
        <div className="match-count" data-testid="sidebar-search-match-count">
          {matchCount === 1 ? '1 match' : `${matchCount} matches`}
        </div>
      )}
    </StyledWrapper>
  );
};

export default CollectionSearch;
