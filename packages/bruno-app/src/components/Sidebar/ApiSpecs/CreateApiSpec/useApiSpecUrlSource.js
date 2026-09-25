import { useState } from 'react';
import { fetchAndValidateApiSpecFromUrl } from 'utils/importers/common';
import { isHttpUrl } from 'utils/url/index';
import {
  INVALID_URL_ERROR,
  deriveApiSpecNameFromUrl,
  detectApiSpecExtension,
  getApiSpecRejectionReason
} from './apiSpecSources';

const useApiSpecUrlSource = () => {
  const [fetchedApiSpec, setFetchedApiSpec] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [derivedName, setDerivedName] = useState('');

  const forget = () => {
    setFetchedApiSpec(null);
    setError('');
  };

  const resolve = async (specUrl) => {
    const url = String(specUrl || '').trim();

    if (!url || !isHttpUrl(url)) {
      setError(INVALID_URL_ERROR);
      return null;
    }

    if (fetchedApiSpec?.url === url) {
      return fetchedApiSpec;
    }

    setIsFetching(true);
    setError('');
    try {
      const { data, specType, rawContent } = await fetchAndValidateApiSpecFromUrl({ url });

      const rejectionReason = getApiSpecRejectionReason(data, specType);
      if (rejectionReason) {
        setFetchedApiSpec(null);
        setDerivedName('');
        setError(rejectionReason);
        return null;
      }

      const apiSpec = { url, rawContent, extension: detectApiSpecExtension(rawContent) };
      setFetchedApiSpec(apiSpec);

      setDerivedName(deriveApiSpecNameFromUrl(data, url));

      return apiSpec;
    } catch (err) {
      setFetchedApiSpec(null);
      setDerivedName('');
      setError(err?.message || 'Failed to fetch the specification');
      return null;
    } finally {
      setIsFetching(false);
    }
  };

  return { fetchedApiSpec, isFetching, error, derivedName, resolve, forget };
};

export default useApiSpecUrlSource;
