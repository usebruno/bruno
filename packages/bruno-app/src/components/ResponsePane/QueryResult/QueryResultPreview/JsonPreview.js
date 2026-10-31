import React, { useState } from 'react';
import ReactJson from 'react-json-view';
import get from 'lodash/get';
import ErrorBanner from 'ui/ErrorBanner';
import MenuDropdown from 'ui/MenuDropdown';
import { isHttpUrl } from 'utils/url';
import { cursorAnchorStyle } from 'utils/common/cursorAnchor';
import { getResponseJsonPath } from 'utils/responseJsonToScript';

const JsonPreview = ({ data, displayedTheme, onLinkClick, onConvertToTest, onConvertToPostResponse }) => {
  const [menu, setMenu] = useState(null);
  // Helper function to validate and parse JSON data
  const validateJsonData = (data) => {
    // If data is already an object or array, use it directly
    if (typeof data === 'object' && data !== null) {
      return { data, error: null };
    }

    // If data is a string, try to parse it
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return { data: parsed, error: null };
      } catch (e) {
        return { data: null, error: `Invalid JSON format: ${e.message}` };
      }
    }

    // For other types, return error
    return { data: null, error: 'Invalid input. Expected a JSON object, array, or valid JSON string.' };
  };

  // Validate and parse JSON data
  const jsonData = validateJsonData(data);

  // Show error if parsing failed
  if (jsonData.error) {
    return <ErrorBanner errors={[{ title: 'Cannot preview as JSON', message: jsonData.error }]} />;
  }

  // Validate that data can be rendered as JSON tree
  if (jsonData.data === null || jsonData.data === undefined) {
    return <ErrorBanner errors={[{ title: 'Cannot preview as JSON', message: 'Data is null or undefined. Expected a valid JSON object or array.' }]} />;
  }

  if (typeof jsonData.data !== 'object') {
    return <ErrorBanner errors={[{ title: 'Cannot preview as JSON', message: 'Data cannot be rendered as a JSON tree. Expected a JSON object or array.' }]} />;
  }

  const handleSelect = (selection) => {
    if (typeof onLinkClick !== 'function' || !isHttpUrl(selection?.value)) {
      return;
    }

    onLinkClick(selection.value.trim());
  };

  const closeMenu = () => setMenu(null);

  // Right-click a property in the JSON tree to convert it into a test or
  // a post-response script. The path is read from the clicked
  // react-json-view row; react-json-view exposes no right-click API.
  const handleContextMenu = (event) => {
    const path = getResponseJsonPath(event.target);
    if (!path || (typeof onConvertToTest !== 'function' && typeof onConvertToPostResponse !== 'function')) {
      return;
    }
    event.preventDefault();
    setMenu({
      x: event.clientX,
      y: event.clientY,
      path,
      value: get(jsonData.data, path)
    });
  };

  const handleConvert = (kind) => {
    if (!menu) {
      return;
    }
    if (kind === 'test' && typeof onConvertToTest === 'function') {
      onConvertToTest(menu);
    } else if (kind === 'post-response' && typeof onConvertToPostResponse === 'function') {
      onConvertToPostResponse(menu);
    }
    closeMenu();
  };

  return (
    <div onContextMenu={handleContextMenu}>
      <ReactJson
        src={jsonData.data}
        theme={displayedTheme === 'light' ? 'rjv-default' : 'monokai'}
        collapsed={1}
        displayDataTypes={false}
        displayObjectSize={true}
        enableClipboard={true}
        onSelect={handleSelect}
        name={false}
        style={{
          backgroundColor: 'transparent',
          fontSize: '12px',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          padding: '16px'
        }}
      />
      {menu && (
        <MenuDropdown
          items={[
            { id: 'test', label: 'Convert to test', onClick: () => handleConvert('test') },
            { id: 'post-response', label: 'Convert to post-response script', onClick: () => handleConvert('post-response') }
          ]}
          placement="bottom-start"
          opened={true}
          onChange={(isOpen) => !isOpen && closeMenu()}
          appendTo={document.body}
          data-testid="response-json-convert-menu"
        >
          <div style={cursorAnchorStyle({ x: menu.x, y: menu.y })} />
        </MenuDropdown>
      )}
    </div>
  );
};

export default JsonPreview;
