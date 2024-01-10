import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

const RequestTabNotFound = ({ handleCloseClick }) => {
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  // add a delay component in react that shows a loading spinner
  // and then shows the error message after a delay
  // this will prevent the error message from flashing on the screen
  useEffect(() => {
    setTimeout(() => {
      setShowErrorMessage(true);
    }, 300);
  }, []);

  if (!showErrorMessage) {
    return null;
  }

  return (
    <>
      <div className="flex items-center tab-label pl-2">
        {showErrorMessage ? (
          <>
            <AlertTriangle size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span className="ml-1">Not Found</span>
          </>
        ) : null}
      </div>
      <div className="flex px-2 close-icon-container" onClick={(e) => handleCloseClick(e)}>
        <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="close-icon">
          <path
            fill="currentColor"
            d="M207.6 256l107.72-107.72c6.23-6.23 6.23-16.34 0-22.58l-25.03-25.03c-6.23-6.23-16.34-6.23-22.58 0L160 208.4 52.28 100.68c-6.23-6.23-16.34-6.23-22.58 0L4.68 125.7c-6.23 6.23-6.23 16.34 0 22.58L112.4 256 4.68 363.72c-6.23 6.23-6.23 16.34 0 22.58l25.03 25.03c6.23 6.23 16.34 6.23 22.58 0L160 303.6l107.72 107.72c6.23 6.23 16.34 6.23 22.58 0l25.03-25.03c6.23-6.23 6.23-16.34 0-22.58L207.6 256z"
          ></path>
        </svg>
      </div>
    </>
  );
};

export default RequestTabNotFound;
