import Modal from 'components/Modal/index';
import { useState, useMemo, useEffect, useRef } from 'react';
import CodeView from './CodeView';
import StyledWrapper from './StyledWrapper';
import { isValidUrl } from 'utils/url';
import { get } from 'lodash';
import { findEnvironmentInCollection } from 'utils/collections';
import { interpolateUrl, interpolateUrlPathParams } from 'utils/url/index';
import { getLanguages } from 'utils/codegenerator/targets';
import { useSelector } from 'react-redux';
import { getGlobalEnvironmentVariables } from 'utils/collections/index';
import { IconChevronDown } from '@tabler/icons';

const GenerateCodeItem = ({ collection, item, onClose }) => {
  const languages = getLanguages();

  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });

  const environment = findEnvironmentInCollection(collection, collection?.activeEnvironmentUid);
  let envVars = {};
  if (environment) {
    const vars = get(environment, 'variables', []);
    envVars = vars.reduce((acc, curr) => {
      acc[curr.name] = curr.value;
      return acc;
    }, {});
  }

  const requestUrl =
    get(item, 'draft.request.url') !== undefined ? get(item, 'draft.request.url') : get(item, 'request.url');

  // interpolate the url
  const interpolatedUrl = interpolateUrl({
    url: requestUrl,
    globalEnvironmentVariables,
    envVars,
    runtimeVariables: collection.runtimeVariables,
    processEnvVars: collection.processEnvVariables
  });

  // interpolate the path params
  const finalUrl = interpolateUrlPathParams(
    interpolatedUrl,
    get(item, 'draft.request.params') !== undefined ? get(item, 'draft.request.params') : get(item, 'request.params')
  );

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
  const [selectedMainLang, setSelectedMainLang] = useState(mainLanguages[0]);
  const [selectedLibrary, setSelectedLibrary] = useState(
    languageGroups[mainLanguages[0]][0].libraryName
  );

  // Get the full language object based on selections
  const selectedLanguage = useMemo(() => {
    const fullName = selectedLibrary === 'default' 
      ? selectedMainLang 
      : `${selectedMainLang}-${selectedLibrary}`;
    
    return languages.find(lang => lang.name === fullName) || languages[0];
  }, [selectedMainLang, selectedLibrary, languages]);

  const availableLibraries = useMemo(() => {
    return languageGroups[selectedMainLang] || [];
  }, [selectedMainLang, languageGroups]);

  const handleMainLanguageChange = (e) => {
    const newMainLang = e.target.value;
    setSelectedMainLang(newMainLang);
    setSelectedLibrary(languageGroups[newMainLang][0].libraryName);
  };
  const [shouldInterpolate, setShouldInterpolate] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredLanguages = useMemo(() => {
    return mainLanguages.filter((lang) =>
      lang.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [mainLanguages, searchQuery]);

  const selectWrapperRef = useRef(null);

  // close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectWrapperRef.current && !selectWrapperRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <Modal size="lg" title="Generate Code" handleCancel={onClose} hideFooter={true}>
      <StyledWrapper>
        <div className="code-generator">
          <div className="toolbar">
            <div className="left-controls">
              <div className="select-wrapper" ref={selectWrapperRef}>
                <div 
                  className="custom-select"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span>{selectedMainLang}</span>
                  <IconChevronDown size={16} className="select-arrow" />
                </div>
                
                {isDropdownOpen && (
                  <div className="select-dropdown">
                    <input
                      type="text"
                      className="language-search"
                      placeholder="Search language..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus={true}
                    />
                    <div className="options-list">
                      {filteredLanguages.map((lang) => (
                        <div
                          key={lang}
                          className={`option ${selectedMainLang === lang ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMainLanguageChange({ target: { value: lang } });
                            setIsDropdownOpen(false);
                            setSearchQuery('');
                          }}
                        >
                          {lang}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {availableLibraries.length > 1 && (
                <div className="library-options">
                  {availableLibraries.map((lib) => (
                    <button
                      key={lib.libraryName}
                      className={`lib-btn ${selectedLibrary === lib.libraryName ? 'active' : ''}`}
                      onClick={() => setSelectedLibrary(lib.libraryName)}
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
                  onChange={(e) => setShouldInterpolate(e.target.checked)}
                />
                <span>Interpolate Variables</span>
              </label>
            </div>
          </div>

          <div className="editor-container">
            {isValidUrl(finalUrl) ? (
              <CodeView
                language={selectedLanguage}
                item={{
                  ...item,
                  request: item.request.url !== ''
                    ? { ...item.request, url: finalUrl }
                    : { ...item.draft.request, url: finalUrl }
                }}
                shouldInterpolate={shouldInterpolate}
              />
            ) : (
              <div className="error-message">
                <h1>Invalid URL: {finalUrl}</h1>
                <p>Please check the URL and try again</p>
              </div>
            )}
          </div>
        </div>
      </StyledWrapper>
    </Modal>
  );
};

export default GenerateCodeItem;
