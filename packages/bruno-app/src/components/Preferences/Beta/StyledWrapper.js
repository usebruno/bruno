import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;

  .submit {
    margin-top: 1rem;
  }

  .beta-feature-item {
    padding: 1rem 0;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .beta-feature-item:last-child {
    border-bottom: none;
  }

  .beta-feature-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-right: 0.75rem;
  }

  .beta-feature-description {
    margin-top: 0.25rem;
  }

  .beta-feature-links {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    margin-top: 0.625rem;
  }

  .beta-feature-link {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.textLink};
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  .no-features-message {
    color: var(--color-gray-500);
    font-style: italic;
  }
`;

export default StyledWrapper;
