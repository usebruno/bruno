import React, { useState } from 'react';
import { fetchAndValidateApiSpecFromUrl } from 'utils/importers/common';
import { isValidUrl } from 'utils/url/index';
import Button from 'ui/Button';
import { useTranslation } from 'react-i18next';

const UrlTab = ({
  setIsLoading,
  handleSubmit,
  setErrorMessage
}) => {
  const [urlInput, setUrlInput] = useState('');
  const { t } = useTranslation();

  const handleUrlImport = async (event) => {
    event.preventDefault();
    if (!urlInput.trim() || !isValidUrl(urlInput.trim())) {
      setErrorMessage(t('SIDEBAR.IMPORT_URL_INVALID'));
      return;
    }
    setIsLoading(true);
    try {
      const { data, specType, rawContent } = await fetchAndValidateApiSpecFromUrl({ url: urlInput.trim() });
      // Pass raw data for all types, include sourceUrl and rawContent for OpenAPI sync
      handleSubmit({ rawData: data, type: specType, sourceUrl: urlInput.trim(), rawContent });
    } catch (err) {
      console.error(err);
      setErrorMessage(t('SIDEBAR.IMPORT_URL_FAILED'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleUrlImport}>
      <div className="flex gap-2">
        <input
          id="urlInput"
          data-testid="url-input"
          type="text"
          value={urlInput}
          autoFocus
          onChange={(e) => {
            setUrlInput(e.target.value);
            setErrorMessage('');
          }}
          placeholder={t('SIDEBAR.IMPORT_URL_PLACEHOLDER')}
          className="flex-1 px-3 py-1 textbox"
        />
        <Button
          type="submit"
          id="import-url-button"
          disabled={!urlInput.trim()}
          variant="filled"
          color="primary"
          style={{ height: '100%' }}
        >
          {t('SIDEBAR.IMPORT_URL_BUTTON')}
        </Button>
      </div>
    </form>
  );
};

export default UrlTab;
