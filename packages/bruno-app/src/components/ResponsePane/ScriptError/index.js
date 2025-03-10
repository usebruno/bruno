import React from 'react';
import { IconAlertCircle, IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';


const ScriptError = ({ item, onClose }) => {
  const preRequestError = item?.preScriptRequestErrorMessage;
  const postResponseError = item?.postScriptResponseErrorMessage;
  
  if (!preRequestError && !postResponseError) return null;
  
  const errorMessage = preRequestError || postResponseError;
  const errorType = preRequestError ? 'Pre-request Script Error' : 'Post-response Script Error';
  
  return (
    <StyledWrapper className="mt-4 mb-2">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="error-icon-container flex-shrink-0">
          <IconAlertCircle size={14} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="error-title">
            {errorType}
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