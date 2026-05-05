import { memo } from 'react';
import SwaggerUI from 'swagger-ui-react';
import StyledWrapper from './StyledWrapper';

const Swagger = ({ spec, onComplete }) => {
  return (
    <StyledWrapper>
      <div className="swagger-root w-full">
        <SwaggerUI spec={spec} onComplete={onComplete} />
      </div>
    </StyledWrapper>
  );
};

export default memo(Swagger);
