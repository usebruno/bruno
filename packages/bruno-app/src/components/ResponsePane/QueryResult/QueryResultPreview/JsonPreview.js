import React from 'react';
import ReactJson from 'react-json-view';
import ErrorBanner from 'ui/ErrorBanner';
import { useTranslation } from 'react-i18next';

const JsonPreview = ({ data, displayedTheme }) => {
  const { t } = useTranslation();

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
        return { data: null, error: t('QUERY_RESULT.INVALID_JSON_FORMAT', { message: e.message }) };
      }
    }

    // For other types, return error
    return { data: null, error: t('QUERY_RESULT.INVALID_JSON_INPUT') };
  };

  // Validate and parse JSON data
  const jsonData = validateJsonData(data);

  // Show error if parsing failed
  if (jsonData.error) {
    return <ErrorBanner errors={[{ title: t('QUERY_RESULT.CANNOT_PREVIEW_JSON'), message: jsonData.error }]} />;
  }

  // Validate that data can be rendered as JSON tree
  if (jsonData.data === null || jsonData.data === undefined) {
    return <ErrorBanner errors={[{ title: t('QUERY_RESULT.CANNOT_PREVIEW_JSON'), message: t('QUERY_RESULT.JSON_DATA_NULL') }]} />;
  }

  if (typeof jsonData.data !== 'object') {
    return <ErrorBanner errors={[{ title: t('QUERY_RESULT.CANNOT_PREVIEW_JSON'), message: t('QUERY_RESULT.JSON_DATA_NOT_OBJECT') }]} />;
  }

  return (
    <ReactJson
      src={jsonData.data}
      theme={displayedTheme === 'light' ? 'rjv-default' : 'monokai'}
      collapsed={1}
      displayDataTypes={false}
      displayObjectSize={true}
      enableClipboard={true}
      name={false}
      style={{
        backgroundColor: 'transparent',
        fontSize: '12px',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        padding: '16px'
      }}
    />
  );
};

export default JsonPreview;
