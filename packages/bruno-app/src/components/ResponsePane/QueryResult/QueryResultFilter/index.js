import { IconFilter } from '@tabler/icons';
import React, { useMemo, useState } from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faFolder } from '@fortawesome/free-solid-svg-icons';
import Modal from 'react-modal';

const QueryResultFilter = ({ onChange, mode, data, item }) => {
  const tooltipText = useMemo(() => {
    if (mode.includes('json')) {
      return 'Filter with JSONPath';
    }

    if (mode.includes('xml')) {
      return 'Filter with XPath';
    }

    return null;
  }, [mode]);

  const [generateTests, setGenerateTests] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');

  const responseData = data;
  const response = item.response;

  const traverseJson = (obj, parentPath = '') => {
    let result = '';

    Object.entries(obj).forEach(([key, value]) => {
      // Find the path baes on the parent
      const currentPath = parentPath ? `${parentPath}.${key}` : key;

      // check in the value is an array
      if (typeof value === 'object' && value !== null) {
        if (Object.entries(value).length > 0) {
          result += traverseJson(value, currentPath);
        } else {
          console.log('key=' + key + ' est vide');
          //result += `key=${key} est vide\n`;
          result += `test("${key} should be empty", function() {
  const data = res.getBody();
  expect(data.${key}).to.be.empty;
});\n\n`;
        }
      } else {
        // we should put between [''] the words that contains "-"
        let currentPathComponents = currentPath.split('.');

        currentPathComponents = currentPathComponents.map((component) => {
          if (component.includes('-')) {
            return `['${component}']`;
          } else {
            return `.${component}`;
          }
        });

        let currentPathFormatted = currentPathComponents.join('');

        result += `test("${currentPath} should equal", function() {
  const data = res.getBody();
  expect(data${currentPathFormatted}).to.equal("${value}");
});\n\n`;
      }
    });

    return result;
  };

  const handleButtonClick = () => {
    setGenerateTests(!generateTests);

    let result = `test("Response Status should be ${response.status}", function() {
  expect(res.getStatus()).to.equal(${response.status});
});\n\n`;

    result += traverseJson(responseData);

    setModalContent(result);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard
      .writeText(modalContent)
      .then(() => {
        alert('successfully copied');
      })
      .catch(() => {
        alert('something went wrong');
      });
  };

  return (
    <div className={'response-filter relative'}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center">
        <div className="text-gray-500 sm:text-sm" id="request-filter-icon">
          <IconFilter size={16} strokeWidth={1.5} />
        </div>
      </div>

      {tooltipText && <ReactTooltip anchorId={'request-filter-icon'} html={tooltipText} />}

      <input
        type="text"
        name="response-filter"
        id="response-filter"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className="block w-full pl-10 py-1 sm:text-sm"
        onChange={onChange}
      />
      <div>
        <button onClick={handleButtonClick}>{'Generate tests'}</button>
      </div>
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal}>
        <div>
          <button onClick={closeModal}>Close Modal</button>
          <button onClick={handleCopyToClipboard}>
            <FontAwesomeIcon className="mr-3 text-gray-500" icon={faCopy} style={{ fontSize: 20 }} />
          </button>
          <pre>{modalContent}</pre>
        </div>
      </Modal>
    </div>
  );
};

export default QueryResultFilter;
