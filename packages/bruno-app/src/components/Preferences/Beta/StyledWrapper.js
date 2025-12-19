import styled from 'styled-components';

const StyledWrapper = styled.div`
  .bruno-form {
    padding: 1rem;
  }

  .submit {
    margin-top: 1rem;
  }

  .beta-feature-item {
    border-radius: 0.5rem;
    border: 1px solid var(--color-gray-200);
    background-color: var(--color-gray-50);
    margin-bottom: 1rem;
  }

  .beta-feature-item:hover {
    background-color: var(--color-gray-100);
  }

  .beta-feature-description {
    margin-top: 0.25rem;
  }

  .no-features-message {
    text-align: center;
    padding: 2rem;
    color: var(--color-gray-500);
    font-style: italic;
  }

  .beta-description {
    color: ${(props) => props.theme.beta.description};
  }

  .beta-feature-description {
    color: ${(props) => props.theme.beta.featureDescription};
  }
`;

export default StyledWrapper;
