import React, { useState } from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const SkippedPathsWarning = ({ paths, itemNoun }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!paths || paths.length === 0) {
    return null;
  }

  return (
    <StyledWrapper>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <IconAlertTriangle size={16} strokeWidth={1.5} className="scan-warning-icon" />
          {paths.length} {itemNoun} were skipped because their config could not be read.
        </span>
        <button
          type="button"
          className="scan-warning-action"
          onClick={() => setShowDetails((value) => !value)}
        >
          {showDetails ? 'Hide Details' : 'View Details'}
        </button>
      </div>
      {showDetails && (
        <ul className="scan-warning-list scrollbar-hover">
          {paths.map((pathname) => (
            <li key={pathname}>
              <span className="scan-warning-path">{pathname}</span>
            </li>
          ))}
        </ul>
      )}
    </StyledWrapper>
  );
};

export default SkippedPathsWarning;
