import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.tabs {
    border-right: 1px solid ${(props) => props.theme.modal.header.borderBottom};
    padding: 8px;
    min-width: 160px;

    .search-container {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      margin-bottom: 8px;
      border: 1px solid ${(props) => props.theme.modal.input.border};
      border-radius: 4px;
      background-color: ${(props) => props.theme.modal.input.bg};

      &:focus-within {
        border-color: ${(props) => props.theme.modal.input.focusBorder};
      }

      .search-icon {
        color: ${(props) => props.theme.colors.text.muted};
        flex-shrink: 0;
      }

      .search-input {
        border: none;
        background: transparent;
        outline: none;
        font-size: ${(props) => props.theme.font.size.base};
        color: ${(props) => props.theme.text};
        width: 100%;

        &::placeholder {
          color: ${(props) => props.theme.colors.text.muted};
        }
      }
    }

    div.tab {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 10px;
      border: none;
      border-radius: 4px;
      color: ${(props) => props.theme.colors.text.muted};
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover {
        background: ${(props) => props.theme.modal.closeButton.hoverBg};
      }

      &:focus,
      &:active,
      &:focus-within,
      &:focus-visible,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &.active {
        color: ${(props) => props.theme.text} !important;
        background: ${(props) => props.theme.modal.title.bg};

        &:hover {
          background: ${(props) => props.theme.modal.title.bg} !important;
        }
      }
    }
  }

  section.tab-panel {
    min-height: 70vh;
    max-height: 70vh;
    overflow-y: auto;
    max-width: 50vw;
  }

  /* Accent colors for checkboxes and radio buttons */
  input[type="checkbox"],
  input[type="radio"] {
    accent-color: ${(props) => props.theme.workspace.accent};
    cursor: pointer;
  }

  /* Section headers */
  .section-header {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    font-weight: 500;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

export default StyledWrapper;
