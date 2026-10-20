import { IconLoader2, IconSearch, IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const CollectionSearch = ({ searchText, setSearchText, showSpinner = false }) => {
  const hasClear = searchText !== '';
  const inputClass = [
    showSpinner ? 'has-spinner' : '',
    hasClear ? 'has-clear' : ''
  ].filter(Boolean).join(' ');

  return (
    <StyledWrapper>
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
        className={inputClass || undefined}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value.toLowerCase())}
      />
      {showSpinner && (
        <div
          className={`search-spinner${hasClear ? ' with-clear' : ''}`}
          data-testid="sidebar-search-spinner"
          aria-hidden="true"
        >
          <IconLoader2 size={14} strokeWidth={1.5} className="animate-spin" />
        </div>
      )}
      {hasClear && (
        <div className="clear-icon" onClick={() => setSearchText('')}>
          <IconX size={14} strokeWidth={1.5} />
        </div>
      )}
    </StyledWrapper>
  );
};

export default CollectionSearch;
