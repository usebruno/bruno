import styled from 'styled-components';

const StyledWrapper = styled.div`
  .proto-file-dropdown-container {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
  }

  .proto-file-dropdown-icon {
    margin-right: 0.25rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .proto-file-dropdown-text {
    font-size: ${(props) => props.theme.font.size.xs};
    white-space: nowrap;
    color: ${(props) => props.theme.dropdown.color};
  }

  .proto-file-dropdown-caret {
    margin-left: 0.25rem;
    color: ${(props) => props.theme.colors.text.muted};
    fill: ${(props) => props.theme.colors.text.muted};
  }

  .proto-file-dropdown-content {
    max-height: fit-content;
    overflow-y: auto;
    width: 30rem;
  }

  .proto-file-dropdown-mode-section {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .proto-file-dropdown-mode-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .proto-file-dropdown-mode-options {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .proto-file-dropdown-mode-option {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};

    &--active {
      font-weight: 500;
    }
  }

  .proto-file-dropdown-reflection-message {
    padding: 0.5rem 0.75rem;
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 0.5rem;
  }
`;

export default StyledWrapper;
