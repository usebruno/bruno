import React from 'react';
import { IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';


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
  
  return (
    <StyledWrapper className="mt-4 mb-2">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          {errors.map((error, index) => (
            <div key={index}>
              {index > 0 && <div className="border-t border-gray-300 my-3 dark:border-gray-600"></div>}
              <div className="error-title">
                {error.title}
              </div>
              <div className="error-message">
                {error.message}
              </div>
            </div>
          ))}
        </div>
        <div 
          className="close-button flex-shrink-0 cursor-pointer"
          onClick={onClose}
        >
          <IconX size={16} strokeWidth={1.5} />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default ScriptError; 