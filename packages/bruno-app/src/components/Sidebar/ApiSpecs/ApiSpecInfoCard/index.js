import React from 'react';
import StyledWrapper from './StyledWrapper';

const ApiSpecInfoCard = ({ apiSpec }) => (
  <StyledWrapper>
    <div className="api-spec-info-card">
      <div className="api-spec-name" title={apiSpec.name}>
        {apiSpec.name}
      </div>
      <div className="api-spec-path">{apiSpec.pathname}</div>
    </div>
  </StyledWrapper>
);

export default ApiSpecInfoCard;
