import SwaggerUI from 'swagger-ui-react';
import StyledWrapper from './StyledWrapper';

const Swagger = ({ spec }) => {
  return (
    <StyledWrapper>
      <div className="swagger-root w-full">
        <SwaggerUI spec={spec} />
      </div>
    </StyledWrapper>
  );
};

export default Swagger;
