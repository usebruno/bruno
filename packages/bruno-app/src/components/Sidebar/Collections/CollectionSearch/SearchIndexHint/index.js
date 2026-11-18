import { useDispatch, useSelector } from 'react-redux';
import get from 'lodash/get';
import toast from 'react-hot-toast';
import { IconInfoCircle, IconX } from '@tabler/icons';
import { Tooltip } from 'react-tooltip';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import useLocalStorage from 'hooks/useLocalStorage';
import Portal from 'ui/Portal';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const DISMISS_KEY = 'bruno.searchIndexHint.dismissed';

const SearchIndexHint = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const searchIndexEnabled = get(preferences, 'cache.searchIndex.enabled', false);
  const [dismissed, setDismissed] = useLocalStorage(DISMISS_KEY, false);

  if (searchIndexEnabled || dismissed) return null;

  const enableIndexing = () => {
    dispatch(savePreferences({
      ...preferences,
      cache: {
        ...preferences.cache,
        searchIndex: { enabled: true }
      }
    }))
      .then(() => toast.success('Search index enabled'))
      .catch(() => toast.error('Failed to enable search index'));
  };

  return (
    <StyledWrapper>
      <div className="index-hint-banner" data-testid="sidebar-search-index-hint">
        <div className="index-hint-copy">
          Enable Indexing?
          <span className="index-hint-info" data-tooltip-id="search-index-hint-info" data-testid="sidebar-search-index-hint-info">
            <IconInfoCircle size={14} strokeWidth={1.5} />
          </span>
          <Portal>
            <Tooltip
              id="search-index-hint-info"
              className="tooltip-mod"
              place="bottom-start"
              positionStrategy="fixed"
              noArrow
              opacity={1}
            >
              Find requests in collections you haven&apos;t opened yet.
            </Tooltip>
          </Portal>
        </div>
        <Button
          size="xs"
          variant="ghost"
          type="button"
          onClick={enableIndexing}
          data-testid="sidebar-search-index-hint-enable"
        >
          Enable
        </Button>
        <button
          type="button"
          className="index-hint-dismiss"
          aria-label="Dismiss search index hint"
          data-testid="sidebar-search-index-hint-dismiss"
          onClick={() => setDismissed(true)}
        >
          <IconX size={14} strokeWidth={1.5} />
        </button>
      </div>
    </StyledWrapper>
  );
};

export default SearchIndexHint;
