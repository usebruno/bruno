import Modal from 'components/Modal/index';
import { useMemo, useEffect, useState, useRef } from 'react';
import CodeView from './CodeView';
import CodeViewToolbar from './CodeViewToolbar';
import StyledWrapper from './StyledWrapper';
import { isValidUrl } from 'utils/url';
import { get } from 'lodash';
import {
  findEnvironmentInCollection,
  findItemInCollection
} from 'utils/collections';
import { interpolateUrl, interpolateUrlPathParams } from 'utils/url/index';
import { getLanguages } from 'utils/codegenerator/targets';
import { useSelector, useDispatch } from 'react-redux';
import { getAllVariables, getGlobalEnvironmentVariables } from 'utils/collections/index';
import { resolveInheritedAuth } from 'utils/auth';
import { loadRequestOnDemand } from 'providers/ReduxStore/slices/collections/actions';

const TEMPLATE_VAR_PATTERN = /\{\{([^}]+)\}\}/;

const validateURLWithVars = (url) => {
  const isValid = isValidUrl(url);
  const hasMissingInterpolations = TEMPLATE_VAR_PATTERN.test(url);
  return isValid && !hasMissingInterpolations;
};

const GenerateCodeItem = ({ collectionUid, item, onClose, isExample = false, exampleUid = null }) => {
  const dispatch = useDispatch();
  const languages = getLanguages();
  const collection = useSelector((state) => state.collections.collections?.find((c) => c.uid === collectionUid));
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const generateCodePrefs = useSelector((state) => state.app.generateCode);
  const globalEnvironmentVariables = getGlobalEnvironmentVariables({
    globalEnvironments,
    activeGlobalEnvironmentUid
  });
  const environment = findEnvironmentInCollection(collection, collection?.activeEnvironmentUid);

  // State for tracking request loading
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const loadingRequestRef = useRef(null);

  // Get the current item from Redux state (may be updated after loading)
  const currentItem = useMemo(() => {
    if (!collection || !item?.uid) {
      return item;
    }
    return findItemInCollection(collection, item.uid) || item;
  }, [collection, item]);

  // Load request on demand if it's partial
  useEffect(() => {
    // Only proceed if we have a valid item and collection
    if (!currentItem || !collection || !collection.uid) {
      return;
    }

    // Check if request is partial and needs to be loaded
    // Only load if not already loading and not the same request we're currently loading
    if (currentItem.partial && !currentItem.loading && loadingRequestRef.current !== currentItem.uid) {
      // Check if pathname exists (required for loading)
      if (!currentItem.pathname) {
        const errorMessage = 'Cannot load request: missing file path. The request file may have been moved or deleted.';
        console.warn(errorMessage);
        setLoadError(errorMessage);
        return;
      }

      // Set loading state
      loadingRequestRef.current = currentItem.uid;
      setIsLoading(true);
      setLoadError(null);

      // Load request on demand
      dispatch(loadRequestOnDemand({
        collectionUid: collection.uid,
        pathname: currentItem.pathname
      }))
        .then(() => {
          // Clear loading state on success
          if (loadingRequestRef.current === currentItem.uid) {
            loadingRequestRef.current = null;
            setIsLoading(false);
            setLoadError(null);
          }
        })
        .catch((error) => {
          console.error('Error loading request on demand:', error);
          // Clear loading state on error and set user-friendly error message
          if (loadingRequestRef.current === currentItem.uid) {
            loadingRequestRef.current = null;
            setIsLoading(false);
            const errorMessage = error?.message || 'Failed to load request. Please try again.';
            setLoadError(errorMessage);
          }
        });
    } else if (!currentItem.partial && loadingRequestRef.current === currentItem.uid) {
      // Clear loading state if request is now fully loaded
      loadingRequestRef.current = null;
      setIsLoading(false);
      setLoadError(null);
    }
  }, [currentItem, collection, dispatch]);

  let envVars = {};
  if (environment) {
    const vars = get(environment, 'variables', []);
    envVars = vars.reduce((acc, curr) => {
      acc[curr.name] = curr.value;
      return acc;
    }, {});
  }

  // Show loading state if request is being loaded or is still partial
  if (isLoading || (currentItem?.partial && !loadError)) {
    return (
      <Modal size="lg" title="Generate Code" handleCancel={onClose} hideFooter={true}>
        <StyledWrapper>
          <div className="code-generator">
            <div className="editor-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <div style={{ textAlign: 'center' }}>
                <p>Loading request...</p>
              </div>
            </div>
          </div>
        </StyledWrapper>
      </Modal>
    );
  }

  // Show error state if loading failed
  if (loadError) {
    return (
      <Modal size="lg" title="Generate Code" handleCancel={onClose} hideFooter={true}>
        <StyledWrapper>
          <div className="code-generator">
            <div className="editor-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <div className="error-message" style={{ textAlign: 'center' }}>
                <h1>Error</h1>
                <p>{loadError}</p>
              </div>
            </div>
          </div>
        </StyledWrapper>
      </Modal>
    );
  }

  // Ensure request is loaded before proceeding
  if (currentItem?.partial || !currentItem?.request) {
    return (
      <Modal size="lg" title="Generate Code" handleCancel={onClose} hideFooter={true}>
        <StyledWrapper>
          <div className="code-generator">
            <div className="editor-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <div style={{ textAlign: 'center' }}>
                <p>Request not loaded</p>
              </div>
            </div>
          </div>
        </StyledWrapper>
      </Modal>
    );
  }

  // Function to handle normal request data
  const getNormalRequestData = () => {
    const requestUrl = get(currentItem, 'draft.request.url') !== undefined ? get(currentItem, 'draft.request.url') : get(currentItem, 'request.url');
    const requestParams = get(currentItem, 'draft.request.params') !== undefined ? get(currentItem, 'draft.request.params') : get(currentItem, 'request.params');

    return {
      url: requestUrl,
      params: requestParams,
      request: get(currentItem, 'draft.request') !== undefined ? get(currentItem, 'draft.request') : get(currentItem, 'request')
    };
  };

  // Function to handle request example data
  const getExampleRequestData = () => {
    if (!isExample || !exampleUid) {
      return getNormalRequestData();
    }

    // Find the specific example - check both draft and non-draft examples
    const examples = currentItem.draft ? get(currentItem, 'draft.examples', []) : get(currentItem, 'examples', []);
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
    return getAllVariables({ ...collection, globalEnvironmentVariables }, currentItem);
  }, [collection, globalEnvironmentVariables, currentItem]);

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
  const resolvedRequest = resolveInheritedAuth(currentItem, collection);

  // Create the final item for code generation
  const finalItem = {
    ...currentItem,
    request: {
      ...resolvedRequest,
      ...requestData.request,
      url: finalUrl
    }
  };

  // Update modal title based on mode
  const modalTitle = isExample ? `Generate Code - ${get(currentItem, 'draft.examples', []).find((e) => e.uid === exampleUid)?.name || 'Example'}` : 'Generate Code';

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
