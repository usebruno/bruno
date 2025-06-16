import Modal from 'components/Modal/index';
import { useState, useMemo, useReducer } from 'react';
import CodeView from './CodeView';
import StyledWrapper from './StyledWrapper';
import { isValidUrl } from 'utils/url';
import { get } from 'lodash';
import {
  findEnvironmentInCollection
} from 'utils/collections';
import { interpolateUrl, interpolateUrlPathParams } from 'utils/url/index';
import { getLanguages } from 'utils/codegenerator/targets';
import { useSelector } from 'react-redux';
import { getGlobalEnvironmentVariables } from 'utils/collections/index';
import { IconChevronDown } from '@tabler/icons';
import { resolveInheritedAuth } from './utils/authUtils';

// Language selection reducer
const languageReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MAIN_LANGUAGE':
      return {
        ...state,
        mainLang: action.payload.mainLang,
        library: action.payload.defaultLibrary
      };
    case 'SET_LIBRARY':
      return {
        ...state,
        library: action.payload
      };
    default:
      return state;
  }
};

const GenerateCodeItem = ({ collectionUid, item, onClose }) => {
  const languages = getLanguages();
  const collection = useSelector(state =>
    state.collections.collections?.find(c => c.uid === collectionUid)
  );
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);

  // Get environment variables
  const globalEnvironmentVariables = getGlobalEnvironmentVariables({
    globalEnvironments,
    activeGlobalEnvironmentUid
  });
  const environment = findEnvironmentInCollection(collection, collection?.activeEnvironmentUid);

  let envVars = {};
  if (environment) {
    const vars = get(environment, 'variables', []);
    envVars = vars.reduce((acc, curr) => {
      acc[curr.name] = curr.value;
      return acc;
    }, {});
  }

  // Get and interpolate URL
  const requestUrl = get(item, 'draft.request.url') !== undefined
    ? get(item, 'draft.request.url')
    : get(item, 'request.url');

  const interpolatedUrl = interpolateUrl({
    url: requestUrl,
    globalEnvironmentVariables,
    envVars,
    runtimeVariables: collection.runtimeVariables,
    processEnvVars: collection.processEnvVariables
  });

  const finalUrl = interpolateUrlPathParams(
    interpolatedUrl,
    get(item, 'draft.request.params') !== undefined
      ? get(item, 'draft.request.params')
      : get(item, 'request.params')
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

  // Language selection state using reducer
  const [languageState, languageDispatch] = useReducer(languageReducer, {
    mainLang: mainLanguages[0],
    library: languageGroups[mainLanguages[0]]?.[0]?.libraryName || 'default'
  });

  const [shouldInterpolate, setShouldInterpolate] = useState(true);

  // Get the full language object based on selections
  const selectedLanguage = useMemo(() => {
    const fullName = languageState.library === 'default'
      ? languageState.mainLang
      : `${languageState.mainLang}-${languageState.library}`;

    return languages.find(lang => lang.name === fullName) || languages[0];
  }, [languageState.mainLang, languageState.library, languages]);

  const availableLibraries = useMemo(() => {
    return languageGroups[languageState.mainLang] || [];
  }, [languageState.mainLang, languageGroups]);

  // Event handlers
  const handleMainLanguageChange = (e) => {
    const newMainLang = e.target.value;
    const defaultLibrary = languageGroups[newMainLang][0].libraryName;
    languageDispatch({
      type: 'SET_MAIN_LANGUAGE',
      payload: { mainLang: newMainLang, defaultLibrary }
    });
  };

  // Resolve auth inheritance
  const resolvedRequest = resolveInheritedAuth(item, collection);

  return (
    <Modal size="lg" title="Generate Code" handleCancel={onClose} hideFooter={true}>
      <StyledWrapper>
        <div className="code-generator">
          <div className="toolbar">
            <div className="left-controls">
              <div className="select-wrapper">
                <select
                  className="native-select"
                  value={languageState.mainLang}
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
                      className={`lib-btn ${languageState.library === lib.libraryName ? 'active' : ''}`}
                      onClick={() => languageDispatch({ type: 'SET_LIBRARY', payload: lib.libraryName })}
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
                  request: {
                    ...resolvedRequest,
                    url: finalUrl
                  }
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
