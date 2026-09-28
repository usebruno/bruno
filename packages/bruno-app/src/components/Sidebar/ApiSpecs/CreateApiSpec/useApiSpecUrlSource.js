import { useRef, useState } from 'react';
import { fetchAndValidateApiSpecFromUrl } from 'utils/importers/common';
import { isHttpUrl } from 'utils/url/index';
import {
  INVALID_URL_ERROR,
  deriveApiSpecNameFromUrl,
  detectApiSpecExtension,
  getApiSpecRejectionReason,
  getFetchErrorMessage
} from './apiSpecSources';

const useApiSpecUrlSource = () => {
  const [fetchedApiSpec, setFetchedApiSpec] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [derivedName, setDerivedName] = useState('');
  const latestRequestIdRef = useRef(0);

  const forget = (nextUrl) => {
    latestRequestIdRef.current += 1;
    setIsFetching(false);
    setFetchedApiSpec(null);
    setError('');
    if (!String(nextUrl || '').trim()) {
      setDerivedName('');
    }
  };

  const resolve = async (specUrl) => {
    const requestId = ++latestRequestIdRef.current;
    const isLatest = () => requestId === latestRequestIdRef.current;
    const url = String(specUrl || '').trim();

    if (!url || !isHttpUrl(url)) {
      setIsFetching(false);
      setError(INVALID_URL_ERROR);
      return null;
    }

    if (fetchedApiSpec?.url === url) {
      setIsFetching(false);
      return fetchedApiSpec;
    }

    setIsFetching(true);
    setError('');
    try {
      const { data, specType, rawContent } = await fetchAndValidateApiSpecFromUrl({ url });
      if (!isLatest()) {
        return null;
      }

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
      if (!isLatest()) {
        return null;
      }
      setFetchedApiSpec(null);
      setDerivedName('');
      setError(getFetchErrorMessage(err, url));
      return null;
    } finally {
      if (isLatest()) {
        setIsFetching(false);
      }
    }
  };

  return { fetchedApiSpec, isFetching, error, derivedName, resolve, forget };
};

export default useApiSpecUrlSource;
