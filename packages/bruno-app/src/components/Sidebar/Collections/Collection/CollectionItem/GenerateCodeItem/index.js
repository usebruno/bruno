import Modal from 'components/Modal/index';
import { useState } from 'react';
import CodeView from './CodeView';
import StyledWrapper from './StyledWrapper';
import { isValidUrl } from 'utils/url';
import { get } from 'lodash';
import { findEnvironmentInCollection, findItemInCollection, findParentItemInCollection } from 'utils/collections';
import { interpolateUrl, interpolateUrlPathParams } from 'utils/url/index';
import { getLanguages } from 'utils/codegenerator/targets';
import { useSelector } from 'react-redux';
import { getGlobalEnvironmentVariables } from 'utils/collections/index';

const getTreePathFromCollectionToItem = (collection, _itemUid) => {
  let path = [];
  let item = findItemInCollection(collection, _itemUid);
  while (item) {
    path.unshift(item);
    item = findParentItemInCollection(collection, item?.uid);
  }
  return path;
};

// Function to resolve inherited auth
const resolveInheritedAuth = (item, collection) => {
  const request = item.draft?.request || item.request;
  const authMode = request?.auth?.mode;
  
  // If auth is not inherit or no auth defined, return the request as is
  if (!authMode || authMode !== 'inherit') {
    return {
      ...request
    };
  }

  // Get the tree path from collection to item
  const requestTreePath = getTreePathFromCollectionToItem(collection, item.uid);
  
  // Default to collection auth
  const collectionAuth = get(collection, 'root.request.auth');
  let effectiveAuth = collectionAuth;
  let source = 'collection';

  // Check folders in reverse to find the closest auth configuration
  for (let i of [...requestTreePath].reverse()) {
    if (i.type === 'folder') {
      const folderAuth = get(i, 'root.request.auth');
      if (folderAuth && folderAuth.mode && folderAuth.mode !== 'none' && folderAuth.mode !== 'inherit') {
        effectiveAuth = folderAuth;
        source = 'folder';
        break;
      }
    }
  }

  return {
    ...request,
    auth: effectiveAuth
  };
};

const GenerateCodeItem = ({ collectionUid, item, onClose }) => {
  const languages = getLanguages();

  const collection = useSelector(state => state.collections.collections?.find(c => c.uid === collectionUid));

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

  // Resolve auth inheritance
  const resolvedRequest = resolveInheritedAuth(item, collection);

  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  return (
    <Modal size="lg" title="Generate Code" handleCancel={onClose} hideFooter={true}>
      <StyledWrapper>
        <div className="flex w-full flexible-container">
          <div>
            <div className="generate-code-sidebar">
              {languages &&
                languages.length &&
                languages.map((language) => (
                  <div
                    key={language.name}
                    className={
                      language.name === selectedLanguage.name ? 'generate-code-item active' : 'generate-code-item'
                    }
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedLanguage(language)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' || (e.shiftKey && e.key === 'Tab')) {
                        e.preventDefault();
                        const currentIndex = languages.findIndex((lang) => lang.name === selectedLanguage.name);
                        const nextIndex = e.shiftKey
                          ? (currentIndex - 1 + languages.length) % languages.length
                          : (currentIndex + 1) % languages.length;
                        setSelectedLanguage(languages[nextIndex]);

                        // Explicitly focus on the new active element
                        const nextElement = document.querySelector(`[data-language="${languages[nextIndex].name}"]`);
                        nextElement?.focus();
                      }
                      
                    }}
                    data-language={language.name}
                    aria-pressed={language.name === selectedLanguage.name}
                  >
                    <span className="capitalize">{language.name}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="flex-grow p-4">
            {isValidUrl(finalUrl) ? (
              <CodeView
                tabIndex={-1}
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
              <div className="flex flex-col justify-center items-center w-full">
                <div className="text-center">
                  <h1 className="text-2xl font-bold">Invalid URL: {finalUrl}</h1>
                  <p className="text-gray-500">Please check the URL and try again</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </StyledWrapper>
    </Modal>
  );
};

export default GenerateCodeItem;
