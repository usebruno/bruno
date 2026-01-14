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
import { getRequestData, buildFinalItem } from './utils/build-final-item';

const TEMPLATE_VAR_PATTERN = /\{\{([^}]+)\}\}/;

const validateURLWithVars = (url) => {
  const isValid = isValidUrl(url);
  const hasMissingInterpolations = TEMPLATE_VAR_PATTERN.test(url);
  return isValid && !hasMissingInterpolations;
};

const GenerateCodeItem = ({ collectionUid, item, onClose, isExample = false, exampleUid = null }) => {
  const languages = getLanguages();
  const collection = useSelector((state) => state.collections.collections?.find((c) => c.uid === collectionUid));
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

  // Get the appropriate request data based on mode (normal or example)
  const requestData = getRequestData(item, isExample, exampleUid);

  const variables = useMemo(() => {
    return getAllVariables({ ...collection, globalEnvironmentVariables }, item);
  }, [collection, globalEnvironmentVariables, item]);

  const interpolatedUrl = interpolateUrl({
    url: requestData.url,
    variables
  });

  // interpolate the path params
  const finalUrl = interpolateUrlPathParams(
    interpolatedUrl,
    requestData.params
  );

  // Get the full language object based on current preferences
  const selectedLanguage = useMemo(() => {
    const fullName = generateCodePrefs.library === 'default'
      ? generateCodePrefs.mainLanguage
      : `${generateCodePrefs.mainLanguage}-${generateCodePrefs.library}`;

    return languages.find((lang) => lang.name === fullName) || languages[0];
  }, [generateCodePrefs.mainLanguage, generateCodePrefs.library, languages]);

  // Build the final item for code generation with resolved auth
  const finalItem = buildFinalItem({
    item,
    collection,
    isExample,
    exampleUid,
    finalUrl
  });

  // Update modal title based on mode
  const modalTitle = isExample ? `Generate Code - ${get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.name || 'Example'}` : 'Generate Code';

  return (
    <Modal size="lg" title={modalTitle} handleCancel={onClose} hideFooter={true}>
      <StyledWrapper>
        <div className="code-generator">
          <CodeViewToolbar />

          <div className="editor-container">
            {validateURLWithVars(finalUrl) ? (
              <CodeView
                language={selectedLanguage}
                item={finalItem}
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
