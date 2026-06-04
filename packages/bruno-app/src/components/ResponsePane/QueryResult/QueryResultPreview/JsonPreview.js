import React from 'react';
import ReactJson from 'react-json-view';
import ErrorBanner from 'ui/ErrorBanner';

const isHttpUrl = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const parsedUrl = new URL(value.trim());
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (e) {
    return false;
  }
};

const getTextValue = (value) => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return '';
  }

  if (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) {
    try {
      return JSON.parse(trimmedValue);
    } catch (e) {
      return trimmedValue.slice(1, -1);
    }
  }

  return trimmedValue;
};

const getUrlFromJsonValueElement = (target) => {
  const valueElement = target?.closest?.('.variable-value');
  if (!valueElement) {
    return null;
  }

  const value = getTextValue(valueElement.textContent);
  return isHttpUrl(value) ? value.trim() : null;
};

const JsonPreview = ({ data, displayedTheme, onLinkClick }) => {
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

  const handleClickCapture = (event) => {
    if (typeof onLinkClick !== 'function') {
      return;
    }

    const url = getUrlFromJsonValueElement(event.target);
    if (!url) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onLinkClick(url);
  };

  return (
    <div onClickCapture={handleClickCapture}>
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
    </div>
  );
};

export default JsonPreview;
