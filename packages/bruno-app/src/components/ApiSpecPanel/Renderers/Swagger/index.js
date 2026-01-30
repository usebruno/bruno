import SwaggerUI from 'swagger-ui-react';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';

const Swagger = ({ string }) => {
  const { displayedTheme } = useTheme();

  console.log('string', string);

  return (
    <StyledWrapper>
      <div className={`swagger-root w-full overflow-y-scroll ${displayedTheme}`}>
        <SwaggerUI spec={string} />
      </div>
    </StyledWrapper>
  );
};

export default Swagger;
