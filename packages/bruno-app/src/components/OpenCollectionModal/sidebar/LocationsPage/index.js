import { useDispatch, useSelector } from 'react-redux';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons';
import ToggleSwitch from 'components/ToggleSwitch';
import ToolHint from 'components/ToolHint';
import { useTheme } from 'providers/Theme';
import {
  pickSearchFolder,
  removeSearchFolder,
  saveSearchWholeComputer
} from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { selectSearchWholeComputer } from 'providers/ReduxStore/slices/open-collection-modal/selectors';
import { toLocationRows } from '../../utils/search-locations';
import LocationRow from './LocationRow';
import StyledWrapper from './StyledWrapper';

const SKIPS_TEXT = 'Bruno skips hidden folders, dependency caches and network drives.';

const LocationsPage = () => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { locations, error } = useSelector((state) => state.openCollectionModal.myComputer);
  const searchWholeComputer = useSelector(selectSearchWholeComputer);
  const rows = toLocationRows(locations);

  return (
    <StyledWrapper>
      {error && (
        <div className="locations-error" role="alert" data-testid="locations-error">
          <IconAlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <label className="locations-switch-card">
        <span className="locations-switch-text">
          <span className="locations-switch-title">Search my whole computer</span>
          <span className="locations-switch-hint">A best-effort search of your whole computer.</span>
        </span>
        <ToggleSwitch
          isOn={searchWholeComputer}
          handleToggle={() => dispatch(saveSearchWholeComputer(!searchWholeComputer))}
          size="2xs"
          activeColor={theme.textLink}
          data-testid="locations-search-whole-computer"
        />
      </label>

      <div>
        <div className="locations-section-title">
          <h4>Search locations</h4>
          <ToolHint anchorSelect="#locations-skips-info" place="right">
            <button
              id="locations-skips-info"
              type="button"
              className="locations-skips-info"
              aria-label="What Bruno skips"
              aria-describedby="locations-skips-text"
              data-tooltip-content={SKIPS_TEXT}
              data-testid="locations-skips-info"
            >
              <IconInfoCircle size={14} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </ToolHint>
          <span id="locations-skips-text" hidden>{SKIPS_TEXT}</span>
        </div>
        <p className="locations-section-hint">Folders Bruno searches for collections.</p>
      </div>

      <div className="locations-list" data-testid="locations-list">
        {rows.map((row) => (
          <LocationRow key={row.id} row={row} onRemove={(folderPath) => dispatch(removeSearchFolder(folderPath))} />
        ))}
        {rows.length === 0 && (
          <div className="locations-empty" data-testid="locations-empty">
            No search locations yet.
          </div>
        )}
        <div className="locations-list-foot">
          <button
            type="button"
            className="text-link hover:underline whitespace-nowrap"
            onClick={() => dispatch(pickSearchFolder())}
            data-testid="locations-add-folder"
          >
            Add folder…
          </button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default LocationsPage;
