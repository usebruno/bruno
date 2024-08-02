import Modal from 'components/Modal/index';
import { useState } from 'react';
import CodeView from './CodeView';
import StyledWrapper from './StyledWrapper';
import { isValidUrl } from 'utils/url';
import { find, get } from 'lodash';
import { findEnvironmentInCollection } from 'utils/collections';
import { interpolateUrl, interpolateUrlPathParams } from 'utils/url/index';

const languages = [
  {
    name: 'HTTP',
    target: 'http',
    client: 'http1.1'
  },
  {
    name: 'JavaScript-Fetch',
    target: 'javascript',
    client: 'fetch'
  },
  {
    name: 'Javascript-jQuery',
    target: 'javascript',
    client: 'jquery'
  },
  {
    name: 'Javascript-axios',
    target: 'javascript',
    client: 'axios'
  },
  {
    name: 'Python-Python3',
    target: 'python',
    client: 'python3'
  },
  {
    name: 'Python-Requests',
    target: 'python',
    client: 'requests'
  },
  {
    name: 'PHP',
    target: 'php',
    client: 'curl'
  },
  {
    name: 'Shell-curl',
    target: 'shell',
    client: 'curl'
  },
  {
    name: 'Shell-httpie',
    target: 'shell',
    client: 'httpie'
  }
];

const GenerateCodeItem = ({ collection, item, onClose }) => {
  const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
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
    envVars,
    collectionVariables: collection.collectionVariables,
    processEnvVars: collection.processEnvVariables
  });

  // interpolate the path params
  const finalUrl = interpolateUrlPathParams(
    interpolatedUrl,
    get(item, 'draft.request.params') !== undefined ? get(item, 'draft.request.params') : get(item, 'request.params')
  );

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
                          url: finalUrl
                        }
                      : {
                          ...item.draft.request,
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
