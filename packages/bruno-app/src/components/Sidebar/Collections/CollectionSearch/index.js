import { IconSearch, IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const CollectionSearch = ({ searchText, setSearchText }) => {
  const { t } = useTranslation();
  return (
    <StyledWrapper>
      <IconSearch size={14} strokeWidth={1.5} className="search-icon" />
      <input
        type="text"
        name="search"
        data-testid="sidebar-search-input"
        placeholder={t('SIDEBAR.SEARCH_REQUESTS_PLACEHOLDER')}
        id="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        autoFocus
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
