import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  max-width: 40rem;
  margin: auto;
  padding: 2rem 1.5rem 1.75rem;
  border: 1px solid ${(props) => props.theme.border.border1};
  border-radius: ${(props) => props.theme.border.radius.lg};

  .setup-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .setup-icon {
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 1.25rem;
  }

  .setup-title {
    font-size: ${(props) => props.theme.font.size.md};
    font-weight: 600;
    color: ${(props) => props.theme.text};
    margin: 0 0 0.375rem 0;
  }

  .setup-description {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    line-height: 1.5;
    margin: 0;
  }

  .setup-form {
    background: ${(props) => props.theme.background.mantle};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    padding: 0.375rem 0.75rem 0.75rem;
    margin-bottom: 1.25rem;
  }

  .connect-button button {
    height: 2.1rem;
  }

  .setup-hint {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin: 0.5rem 0 0 0;
  }

  .setup-error {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.danger};
    margin: 0.5rem 0 0 0;
  }

  .setup-features {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .setup-feature {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};

    svg {
      color: ${(props) => props.theme.colors.text.green};
      flex-shrink: 0;
    }
  }
`;

export default StyledWrapper;
