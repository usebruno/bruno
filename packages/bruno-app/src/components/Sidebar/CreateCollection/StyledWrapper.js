import styled from 'styled-components';

const StyledWrapper = styled.div`
  .advanced-options {
    .caret {
      color: ${(props) => props.theme.textLink};
      fill: ${(props) => props.theme.textLink};
    }
  }

  .folder-name-input-container {
    display: flex;
    align-items: center;
    border: 1px solid ${(props) => props.theme.modal.input.border};
    border-radius: 4px;
    background-color: ${(props) => props.theme.modal.input.bg};
    overflow: hidden;

    &:focus-within {
      border-color: ${(props) => props.theme.modal.input.focusBorder};
    }

    .folder-name-input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 0.45rem;
      outline: none;
      color: ${(props) => props.theme.text};
      font-size: ${(props) => props.theme.font.size.base};
    }

    .folder-extension {
      padding: 0.45rem 0.75rem;
      color: ${(props) => props.theme.colors.text.muted};
      font-size: ${(props) => props.theme.font.size.base};
      background-color: transparent;
    }
  }

  .format-toggle-group {
    display: flex;
    gap: 8px;
  }

  .format-toggle-btn {
    padding: 8px 16px;
    min-width: 140px;
    border: 1px solid ${(props) => props.theme.modal.input.border};
    border-radius: 4px;
    background-color: transparent;
    color: ${(props) => props.theme.text};
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 400;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: ${(props) => props.theme.modal.closeButton.hoverBg};
    }

    &.active {
      background-color: ${(props) => props.theme.modal.title.bg};
      border-color: ${(props) => props.theme.text};
      font-weight: 500;
    }
  }
`;

export default StyledWrapper;
