import styled from 'styled-components';

const StyledWrapper = styled.div`
  .create-request {
    color: #737373;
    font-size: 0.75rem;
  }

  .create-request-options {
    .http, .graphql {
      cursor: pointer;
      padding-right: 1rem;
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;

      &:hover {
        span.name {
          text-decoration: underline;
        }
      }
    }
  }
`;

export default StyledWrapper;
