import Modal from 'components/Modal/index';
import { useState } from 'react';
import CodeView from './CodeView';
import StyledWrapper from './StyledWrapper';
import { interpolateHeaders, isValidUrl } from 'utils/url';
import { get } from 'lodash';
import { findEnvironmentInCollection } from 'utils/collections';
import { interpolateUrl, interpolateUrlPathParams } from 'utils/url/index';
import { getLanguages } from 'utils/codegenerator/targets';
import { useSelector } from 'react-redux';
import { getGlobalEnvironmentVariables } from 'utils/collections/index';
import { getAuthHeaders } from 'utils/codegenerator/auth';

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


  const collectionRootAuth = collection?.root?.request?.auth;
  const requestAuth = item.draft ? get(item, 'draft.request.auth') : get(item, 'request.auth');
  const requestHeaders = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');
  const headers = [
    ...getAuthHeaders(collectionRootAuth, requestAuth),
    ...(collection?.root?.request?.headers || []),
    ...(requestHeaders || [])
  ];

  const finalHeaders = interpolateHeaders({
    header: headers,
    globalEnvironmentVariables,
    envVars,
    runtimeVariables: collection.runtimeVariables,
    processEnvVars: collection.processEnvVariables
  });


  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  return (
    <Modal size="lg" title="Generate Code" handleCancel={onClose} hideFooter={true}>
      <StyledWrapper>
        <div className="flex w-full">
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
                    onClick={() => setSelectedLanguage(language)}
                  >
                    <span className="capitalize">{language.name}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="flex-grow p-4">
            {isValidUrl(finalUrl) ? (
              <CodeView
                language={selectedLanguage}
                item={{
                  ...item,
                  request:
                    item.request.url !== ''
                      ? {
                          ...item.request,
                          url: finalUrl,
                          headers: finalHeaders
                        }
                      : {
                          ...item.draft.request,
                          url: finalUrl,
                          headers: finalHeaders
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
