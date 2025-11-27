import React from 'react';
import IconAlertTriangleFilled from '../Icons/IconAlertTriangleFilled';
import StyledWrapper from './StyledWrapper';

const DeprecationWarning = ({ featureName, learnMoreUrl }) => {
  return (
    <StyledWrapper>
      <div className="deprecation-warning">
        <IconAlertTriangleFilled className="warning-icon" size={16} />
        <span className="warning-text">
          {featureName} will be removed in <strong>v3.0.0</strong>. They are deprecated and will no longer be supported. Learn more in{' '}
          <a href={learnMoreUrl} target="_blank" rel="noreferrer">this post</a> or contact us at{' '}
          <a href="mailto:support@usebruno.com">support@usebruno.com</a> with questions.
        </span>
      </div>
    </StyledWrapper>
  );
};

export default DeprecationWarning;
