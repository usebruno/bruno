import { IconSearch, IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const CollectionSearch = ({ searchText, setSearchText }) => {
  return (
    <StyledWrapper>
      <IconSearch size={14} strokeWidth={1.5} className="search-icon" />
      <input
        type="text"
        name="search"
        placeholder="Search requests..."
        id="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value.toLowerCase())}
      />
      {searchText !== '' && (
        <div className="clear-icon" onClick={() => setSearchText('')}>
          <IconX size={14} strokeWidth={1.5} />
        </div>
      )}
    </StyledWrapper>
  );
};

export default CollectionSearch;
