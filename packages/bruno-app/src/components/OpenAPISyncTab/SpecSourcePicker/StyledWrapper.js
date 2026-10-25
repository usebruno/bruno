import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tabs {
    margin-bottom: 0.75rem;
  }

  .source-row {
    display: flex;
    gap: 0.375rem;
    align-items: center;
  }

  .source-input {
    flex: 1;
    min-width: 0;
    height: 1.75rem;
    padding: 0.375rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.base};
    outline: none;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &:disabled {
      cursor: not-allowed;
      color: ${(props) => props.theme.colors.text.muted};
    }

    &::placeholder {
      color: ${(props) => props.theme.input.placeholder.color};
      opacity: ${(props) => props.theme.input.placeholder.opacity};
    }
  }

  .select-wrapper {
    position: relative;
    display: flex;
    flex: 1;
    min-width: 0;
  }

  .workspace-select {
    appearance: none;
    padding-top: 0;
    padding-bottom: 0;
    padding-right: 1.75rem;
  }

  .select-caret {
    position: absolute;
    top: 50%;
    right: calc(0.5rem + 1px);
    transform: translateY(-50%);
    pointer-events: none;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .file-pick-btn {
    padding-top: 0;
    padding-bottom: 0;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .file-input {
    display: none;
  }
`;

export default StyledWrapper;
