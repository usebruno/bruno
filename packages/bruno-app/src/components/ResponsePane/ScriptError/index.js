import React from 'react';
import ErrorMessage from 'components/ErrorMessage';

const ScriptError = ({ item, onClose }) => {
  const preRequestError = item?.preRequestScriptErrorMessage;
  const postResponseError = item?.postResponseScriptErrorMessage;
  const testScriptError = item?.testScriptErrorMessage;

  if (!preRequestError && !postResponseError && !testScriptError) return null;

  const errors = [];

  if (preRequestError) {
    errors.push({
      title: 'Pre-Request Script Error',
      message: preRequestError
    });
  }

  if (postResponseError) {
    errors.push({
      title: 'Post-Response Script Error',
      message: postResponseError
    });
  }

  if (testScriptError) {
    errors.push({
      title: 'Test Script Error',
      message: testScriptError
    });
  }

  return <ErrorMessage errors={errors} onClose={onClose} className="mt-4 mb-2" />;
};

export default ScriptError;
