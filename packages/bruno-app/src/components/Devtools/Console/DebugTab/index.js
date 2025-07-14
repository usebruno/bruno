import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconBug } from '@tabler/icons';
import { 
  setSelectedError,
  clearDebugErrors
} from 'providers/ReduxStore/slices/logs';
import StyledWrapper from './StyledWrapper';

const ErrorRow = ({ error, isSelected, onClick }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const getShortMessage = (message, maxLength = 80) => {
    if (!message) return 'Unknown error';
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  const getLocation = (error) => {
    if (error.filename) {
      const filename = error.filename.split('/').pop(); // Get just the filename
      if (error.lineno && error.colno) {
        return `${filename}:${error.lineno}:${error.colno}`;
      } else if (error.lineno) {
        return `${filename}:${error.lineno}`;
      }
      return filename;
    }
    return '-';
  };

  return (
    <div 
      className={`error-row ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="error-message" title={error.message}>
        {getShortMessage(error.message)}
      </div>
      
      <div className="error-location" title={error.filename}>
        {getLocation(error)}
      </div>
      
      <div className="error-time">
        {formatTime(error.timestamp)}
      </div>
    </div>
  );
};

const DebugTab = () => {
  const dispatch = useDispatch();
  const { debugErrors, selectedError } = useSelector(state => state.logs);

  const handleErrorClick = (error) => {
    dispatch(setSelectedError(error));
  };

  const handleClearErrors = () => {
    dispatch(clearDebugErrors());
  };

  return (
    <StyledWrapper>
      <div className="debug-content">
        {debugErrors.length === 0 ? (
          <div className="debug-empty">
            <IconBug size={48} strokeWidth={1} />
            <p>No errors</p>
            <span>console.error() calls will appear here</span>
          </div>
        ) : (
          <div className="errors-container">
            <div className="errors-header">
              <div className="header-message">Message</div>
              <div className="header-location">Location</div>
              <div className="header-time">Time</div>
            </div>
            
            <div className="errors-list">
              {debugErrors.map((error, index) => (
                <ErrorRow
                  key={error.id}
                  error={error}
                  isSelected={selectedError?.id === error.id}
                  onClick={() => handleErrorClick(error)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default DebugTab; 