import styled from 'styled-components';

const StyledWrapper = styled.div`
  .message-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    padding: 4px 0px;
    height: 32px;
    flex-shrink: 0;

    .message-label {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.subtext1};
      margin-right: auto;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      color: ${(props) => props.theme.colors.text.muted};
      transition: all 0.15s ease;

      &:hover {
        background-color: ${(props) => props.theme.dropdown.hoverBg};
        color: ${(props) => props.theme.text};
      }
    }
  }

  .body-mode-selector {
    background: transparent;
    border-radius: 3px;

    .dropdown-item {
      padding: 0.2rem 0.6rem !important;
      padding-left: 1.5rem !important;
    }

    .label-item {
      padding: 0.2rem 0.6rem !important;
    }

    .selected-body-mode {
      color: ${(props) => props.theme.primary.text};
    }
  }

  .caret {
    color: ${(props) => props.theme.colors.text.muted};
    fill: ${(props) => props.theme.colors.text.muted};
  }

  .editor-container {
    flex: 1;
    min-height: 0;
  }
`;

export default StyledWrapper;
