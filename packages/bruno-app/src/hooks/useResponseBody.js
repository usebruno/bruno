import { useCallback, useEffect, useRef, useState } from 'react';
import { getResponseBodyClient } from 'utils/response-body';

/**
 * Lazy read of a main-process response body by bodyRef.
 * @param {{ bodyRef?: string|null, contentType?: string, mode?: 'text'|'blob' }} options
 */
export const useResponseBody = ({ bodyRef, contentType, mode = 'text' } = {}) => {
  const [data, setData] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const generationRef = useRef(0);
  const objectUrlRef = useRef(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setObjectUrl(null);
  }, []);

  const reset = useCallback(() => {
    generationRef.current += 1;
    setData(null);
    setError(null);
    setLoading(false);
    revokeObjectUrl();
  }, [revokeObjectUrl]);

  useEffect(() => {
    reset();
  }, [bodyRef, reset]);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  const load = useCallback(async () => {
    if (!bodyRef) {
      return false;
    }

    const gen = generationRef.current;
    setLoading(true);
    setError(null);

    try {
      if (mode === 'blob') {
        const result = await getResponseBodyClient().read(bodyRef, { encoding: 'bytes' });
        if (gen !== generationRef.current) {
          return false;
        }
        const bytes = result?.bytes;
        const blob = new Blob([bytes], {
          type: contentType || result?.contentType || 'application/octet-stream'
        });
        revokeObjectUrl();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setObjectUrl(url);
      } else {
        const result = await getResponseBodyClient().read(bodyRef);
        if (gen !== generationRef.current) {
          return false;
        }
        setData(result?.data ?? '');
      }
      return true;
    } catch (err) {
      if (gen !== generationRef.current) {
        return false;
      }
      setError(err);
      return false;
    } finally {
      if (gen === generationRef.current) {
        setLoading(false);
      }
    }
  }, [bodyRef, contentType, mode, revokeObjectUrl]);

  return { load, data, objectUrl, loading, error, reset };
};
