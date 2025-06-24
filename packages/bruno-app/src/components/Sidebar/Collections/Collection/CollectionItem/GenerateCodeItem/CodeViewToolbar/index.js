import { IconChevronDown } from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { useMemo } from 'react';
import { getLanguages } from 'utils/codegenerator/targets';
import { updateGenerateCode } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

const CodeViewToolbar = () => {
  const dispatch = useDispatch();
  const languages = getLanguages();
  const generateCodePrefs = useSelector((state) => state.app.generateCode);

  // Group languages by their main language type
  const languageGroups = useMemo(() => {
    return languages.reduce((acc, lang) => {
      const mainLang = lang.name.split('-')[0];
      if (!acc[mainLang]) {
        acc[mainLang] = [];
      }
      acc[mainLang].push({
        ...lang,
        libraryName: lang.name.split('-')[1] || 'default'
      });
      return acc;
    }, {});
  }, [languages]);

  const mainLanguages = useMemo(() => Object.keys(languageGroups), [languageGroups]);

  const availableLibraries = useMemo(() => {
    return languageGroups[generateCodePrefs.mainLanguage] || [];
  }, [generateCodePrefs.mainLanguage, languageGroups]);

  // Event handlers
  const handleMainLanguageChange = (e) => {
    const newMainLang = e.target.value;
    const defaultLibrary = languageGroups[newMainLang][0].libraryName;
    
    dispatch(updateGenerateCode({
      mainLanguage: newMainLang,
      library: defaultLibrary
    }));
  };

  const handleLibraryChange = (libraryName) => {
    dispatch(updateGenerateCode({
      library: libraryName
    }));
  };

  const handleInterpolateChange = (e) => {
    dispatch(updateGenerateCode({
      shouldInterpolate: e.target.checked
    }));
  };

  return (
    <StyledWrapper>
      <div className="toolbar">
        <div className="left-controls">
          <div className="select-wrapper">
            <select
              className="native-select"
              value={generateCodePrefs.mainLanguage}
              onChange={handleMainLanguageChange}
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
                  className={`lib-btn ${generateCodePrefs.library === lib.libraryName ? 'active' : ''}`}
                  onClick={() => handleLibraryChange(lib.libraryName)}
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
              checked={generateCodePrefs.shouldInterpolate}
              onChange={handleInterpolateChange}
            />
            <span>Interpolate Variables</span>
          </label>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CodeViewToolbar; 