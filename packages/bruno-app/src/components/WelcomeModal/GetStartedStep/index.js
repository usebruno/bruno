import React from 'react';
import { IconPlus, IconDownload, IconFileImport } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const GetStartedStep = ({ onCreateCollection, onImportCollection, onOpenCollection }) => (
  <StyledWrapper className="step-body">
    <div className="step-label">Your first collection</div>
    <div className="step-title">You're all set! What's next?</div>
    <div className="step-description">
      Create a new collection to start building requests, or import one you already have.
    </div>

    <div className="primary-actions">
      <button className="primary-action-card" onClick={onCreateCollection}>
        <div className="card-icon">
          <IconPlus size={20} stroke={1.5} />
        </div>
        <div className="card-title">Create Collection</div>
        <div className="card-desc">Start fresh with a new API collection</div>
      </button>

      <button className="primary-action-card" onClick={onImportCollection}>
        <div className="card-icon">
          <IconDownload size={20} stroke={1.5} />
        </div>
        <div className="card-title">Import Collection</div>
        <div className="card-desc">Bring in Postman, OpenAPI, or Insomnia</div>
      </button>
    </div>

    <div className="secondary-actions">
      <button className="secondary-action" onClick={onOpenCollection}>
        <span className="secondary-icon">
          <IconFileImport size={16} stroke={1.5} />
        </span>
        <div>
          <div className="secondary-label">Open existing collection</div>
          <div className="secondary-desc">Open a Bruno collection from your filesystem</div>
        </div>
      </button>
    </div>
  </StyledWrapper>
);

export default GetStartedStep;
