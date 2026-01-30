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
import { resolveInheritedAuth } from 'utils/auth';

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

  // Function to handle normal request data
  const getNormalRequestData = () => {
    const requestUrl = get(item, 'draft.request.url') !== undefined ? get(item, 'draft.request.url') : get(item, 'request.url');
    const requestParams = get(item, 'draft.request.params') !== undefined ? get(item, 'draft.request.params') : get(item, 'request.params');

    return {
      url: requestUrl,
      params: requestParams,
      request: get(item, 'draft.request') !== undefined ? get(item, 'draft.request') : get(item, 'request')
    };
  };

  // Function to handle request example data
  const getExampleRequestData = () => {
    if (!isExample || !exampleUid) {
      return getNormalRequestData();
    }

    // Find the specific example - check both draft and non-draft examples
    const examples = item.draft ? get(item, 'draft.examples', []) : get(item, 'examples', []);
    const example = examples.find((e) => e.uid === exampleUid);

    if (!example) {
      return getNormalRequestData();
    }

    // Use example request data
    const requestUrl = get(example, 'request.url');
    const requestParams = get(example, 'request.params');
    const requestData = get(example, 'request');

    return {
      url: requestUrl,
      params: requestParams,
      request: requestData
    };
  };

  // Get the appropriate request data based on mode
  const requestData = isExample ? getExampleRequestData() : getNormalRequestData();

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

  // Resolve auth inheritance
  const resolvedRequest = resolveInheritedAuth(item, collection);

  // requestData.request contains either the normal request or example request data.
  // We explicitly set auth from resolvedRequest to ensure inherited auth
  // (from folders/collection) is resolved correctly in generated code.
  const finalItem = {
    ...item,
    request: {
      ...requestData.request,
      auth: resolvedRequest.auth,
      url: finalUrl
    }
  };

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
