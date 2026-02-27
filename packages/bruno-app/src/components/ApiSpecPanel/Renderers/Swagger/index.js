import SwaggerUI from 'swagger-ui-react';
import StyledWrapper from './StyledWrapper';

const Swagger = ({ string }) => {
  return (
    <StyledWrapper>
      <div className="swagger-root w-full">
        <SwaggerUI spec={string} />
      </div>
    </StyledWrapper>
  );
};

export default Swagger;
