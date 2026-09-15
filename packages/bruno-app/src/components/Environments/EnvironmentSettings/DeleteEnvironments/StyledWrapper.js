import styled from 'styled-components';

const StyledWrapper = styled.div`
  button.submit {
    color: white;
    background-color: var(--color-background-danger) !important;
    border: inherit !important;

    &:hover {
      border: inherit !important;
    }
  }

  .env-delete-warning {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    color: ${(props) => props.theme.status.warning.text};
    background-color: ${(props) => props.theme.status.warning.background};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.5rem 0.625rem;
    margin-top: 12px;
    font-size: ${(props) => props.theme.font.size.sm};

    .warning-icon {
      flex-shrink: 0;
      margin-top: 1px;
    }
  }
`;

export default StyledWrapper;
