import React from 'react';
import { IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';


const ScriptError = ({ item, onClose }) => {
  const preRequestError = item?.preRequestScriptErrorMessage;
  const postResponseError = item?.postResponseScriptErrorMessage;
  
  if (!preRequestError && !postResponseError) return null;
  
  const errorMessage = preRequestError || postResponseError;
  const errorTitle = preRequestError ? 'Pre-Request Script Error' : 'Post-Response Script Error';
  
  return (
    <StyledWrapper className="mt-4 mb-2">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="error-title">
            {errorTitle}
          </div>
          <div className="error-message">
            {errorMessage}
          </div>
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