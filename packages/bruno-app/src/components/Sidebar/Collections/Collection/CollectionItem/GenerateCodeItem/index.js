import Modal from 'components/Modal/index';
import { useState } from 'react';
import CodeView from './CodeView';
import StyledWrapper from './StyledWrapper';
import ErrorBoundary from 'src/pages/ErrorBoundary/index';
import { isValidUrl } from 'utils/url/index';

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
const index = ({ item, onClose }) => {
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  return (
    <StyledWrapper>
      <Modal size="lg" title="Generate Code" handleCancel={onClose} hideFooter={true}>
        <div className="flex">
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
          {isValidUrl(item.request.url) ? (
            <CodeView language={selectedLanguage} item={item} />
          ) : (
            <div className="flex flex-col justify-center items-center w-full">
              <div className="text-center">
                <h1 className="text-2xl font-bold">Invalid URL</h1>
                <p className="text-gray-500">Please check the URL and try again</p>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default index;
