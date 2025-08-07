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
import { useSelector } from 'react-redux';
import { getAllVariables, getGlobalEnvironmentVariables } from 'utils/collections/index';
import { resolveInheritedAuth } from './utils/auth-utils';

const GenerateCodeItem = ({ collectionUid, item, onClose }) => {
  const languages = getLanguages();
  const collection = useSelector(state => state.collections.collections?.find(c => c.uid === collectionUid));
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const generateCodePrefs = useSelector((state) => state.app.generateCode);
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

  const requestUrl =
    get(item, 'draft.request.url') !== undefined ? get(item, 'draft.request.url') : get(item, 'request.url');

  const variables = getAllVariables(collection, item);

  const interpolatedUrl = interpolateUrl({
    url: requestUrl,
    variables
  });

  // interpolate the path params
  const finalUrl = interpolateUrlPathParams(
    interpolatedUrl,
    get(item, 'draft.request.params') !== undefined ? get(item, 'draft.request.params') : get(item, 'request.params')
  );

  // Get the full language object based on current preferences
  const selectedLanguage = useMemo(() => {
    const fullName = generateCodePrefs.library === 'default'
      ? generateCodePrefs.mainLanguage
      : `${generateCodePrefs.mainLanguage}-${generateCodePrefs.library}`;

    return languages.find(lang => lang.name === fullName) || languages[0];
  }, [generateCodePrefs.mainLanguage, generateCodePrefs.library, languages]);

  // Resolve auth inheritance
  const resolvedRequest = resolveInheritedAuth(item, collection);

  return (
    <Modal size="lg" title="Generate Code" handleCancel={onClose} hideFooter={true}>
      <StyledWrapper>
        <div className="code-generator">
          <CodeViewToolbar />

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
