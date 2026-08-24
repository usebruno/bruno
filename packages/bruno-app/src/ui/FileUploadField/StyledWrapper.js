import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  min-width: 0;
  padding: 0.45rem;
  line-height: 1.5;
  border-radius: ${(props) => props.theme.border.radius.sm};
  background-color: ${(props) => props.theme.input.bg};
  border: 1px solid ${(props) => props.theme.input.border};
  color: ${(props) => props.theme.text};
  transition: background-color 0.12s ease, border-color 0.12s ease;

  &:focus-within {
    border-color: ${(props) => props.theme.input.focusBorder};
  }

  .file-upload-input {
    display: none;
  }

  .file-upload-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1 1 auto;
    min-width: 0;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    line-height: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;

    &:disabled {
      cursor: not-allowed;
    }
  }

  .file-upload-icon {
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .file-upload-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:not(.has-value) .file-upload-name {
    color: ${(props) => props.theme.input.placeholder.color};
    opacity: ${(props) => props.theme.input.placeholder.opacity};
  }

  &.is-invalid {
    border-color: ${(props) => props.theme.colors.text.danger};

    .file-upload-icon {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  &.is-disabled {
    opacity: 0.5;
  }
`;

export default StyledWrapper;
