import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  .description {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.5;
  }

  .setting-card {
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    padding: 1rem;
    margin-top: 1rem;
    max-width: 48rem;
  }

  textarea {
    resize: vertical;
    min-height: 5rem;
  }

  .request-list {
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    max-height: 18rem;
    overflow: auto;
  }

  .request-row {
    display: flex;
    align-items: flex-start;
    padding: 0.625rem 0.75rem;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .request-row:last-child {
    border-bottom: 0;
  }

  .request-method {
    min-width: 3.5rem;
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
