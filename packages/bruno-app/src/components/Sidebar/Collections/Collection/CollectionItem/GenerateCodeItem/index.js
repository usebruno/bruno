import Modal from 'components/Modal/index';
import { useMemo } from 'react';
import CodeView from './CodeView';
import CodeViewToolbar from './CodeViewToolbar';
import StyledWrapper from './StyledWrapper';
import { isValidUrl } from 'utils/url';
import { get } from 'lodash';
import {
  findEnvironmentInCollection
} from 'utils/collections';
import { interpolateUrl, interpolateUrlPathParams } from 'utils/url/index';
import { getLanguages } from 'utils/codegenerator/targets';
import { useSelector, useDispatch } from 'react-redux';
import { getGlobalEnvironmentVariables } from 'utils/collections/index';
import { resolveInheritedAuth } from './utils/auth-utils';
import { updateGenerateCode } from 'providers/ReduxStore/slices/app';

const GenerateCodeItem = ({ collectionUid, item, onClose }) => {
  const dispatch = useDispatch();
  const languages = getLanguages();
  const collection = useSelector(state =>
    state.collections.collections?.find(c => c.uid === collectionUid)
  );
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const generateCodePrefs = useSelector((state) => state.app.generateCode);

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

  // Get the full language object based on current preferences
  const selectedLanguage = useMemo(() => {
    const fullName = generateCodePrefs.library === 'default'
      ? generateCodePrefs.mainLanguage
      : `${generateCodePrefs.mainLanguage}-${generateCodePrefs.library}`;

    return languages.find(lang => lang.name === fullName) || languages[0];
  }, [generateCodePrefs.mainLanguage, generateCodePrefs.library, languages]);

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

  // Resolve auth inheritance
  const resolvedRequest = resolveInheritedAuth(item, collection);

  return (
    <Modal size="lg" title="Generate Code" handleCancel={onClose} hideFooter={true}>
      <StyledWrapper>
        <div className="code-generator">
          <CodeViewToolbar 
            onLanguageChange={handleMainLanguageChange}
            onLibraryChange={handleLibraryChange}
            onInterpolateChange={handleInterpolateChange}
            shouldInterpolate={generateCodePrefs.shouldInterpolate}
            availableLibraries={availableLibraries}
            mainLanguages={mainLanguages}
            currentMainLanguage={generateCodePrefs.mainLanguage}
            currentLibrary={generateCodePrefs.library}
          />

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
                shouldInterpolate={generateCodePrefs.shouldInterpolate}
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
