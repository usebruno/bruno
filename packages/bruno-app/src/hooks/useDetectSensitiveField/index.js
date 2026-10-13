import { useCallback } from 'react';
import { classifySensitiveValue } from 'utils/sensitive-fields';

export const useDetectSensitiveField = (collection) => {
  const isSensitive = useCallback((value, item) => {
    const result = classifySensitiveValue(value, { collection, item });
    return {
      showWarning: result.showWarning,
      warningMessage: result.warningMessage
    };
  }, [collection]);

  return {
    isSensitive
  };
};
