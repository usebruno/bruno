import React from 'react';
import StyledWrapper from './StyledWrapper';

const StorageStep = ({ collectionLocation, onBrowse }) => (
  <StyledWrapper className="step-body">
    <div className="step-label">Storage</div>
    <div className="step-title">Where should we store your collections?</div>
    <div className="step-description">
      Bruno saves collections as plain files on your filesystem — perfect for version control with Git.
    </div>

    <div className="location-input-group">
      <div className="location-path-display" onClick={onBrowse} role="button" tabIndex={0}>
        {collectionLocation ? (
          <span className="path-text">{collectionLocation}</span>
        ) : (
          <span className="path-text path-placeholder">Click to choose a folder...</span>
        )}
        <span className="browse-label">Browse</span>
      </div>
    </div>
    <div className="location-hint">
      Each collection gets its own folder inside this directory. You can change this per-collection later.
    </div>
  </StyledWrapper>
);

export default StorageStep;
