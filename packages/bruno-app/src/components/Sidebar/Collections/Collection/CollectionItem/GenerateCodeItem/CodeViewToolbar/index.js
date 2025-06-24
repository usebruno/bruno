import { IconChevronDown } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const CodeViewToolbar = ({
  onLanguageChange,
  onLibraryChange,
  onInterpolateChange,
  shouldInterpolate,
  availableLibraries,
  mainLanguages,
  currentMainLanguage,
  currentLibrary
}) => {
  return (
    <StyledWrapper>
      <div className="toolbar">
        <div className="left-controls">
          <div className="select-wrapper">
            <select
              className="native-select"
              value={currentMainLanguage}
              onChange={onLanguageChange}
            >
              {mainLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <IconChevronDown size={16} className="select-arrow" />
          </div>

          {availableLibraries.length > 1 && (
            <div className="library-options">
              {availableLibraries.map((lib) => (
                <button
                  key={lib.libraryName}
                  className={`lib-btn ${currentLibrary === lib.libraryName ? 'active' : ''}`}
                  onClick={() => onLibraryChange(lib.libraryName)}
                >
                  {lib.libraryName}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="right-controls">
          <label className="interpolate-checkbox">
            <input
              type="checkbox"
              checked={shouldInterpolate}
              onChange={onInterpolateChange}
            />
            <span>Interpolate Variables</span>
          </label>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CodeViewToolbar; 