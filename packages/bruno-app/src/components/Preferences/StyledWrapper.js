import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.tabs {
    padding: 12px;
    min-width: 160px;

    div.tab {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 10px;
      border: none;
      border-radius: ${(props) => props.theme.border.radius.sm};
      color: ${(props) => props.theme.colors.text.muted};
      cursor: pointer;
      transition: background-color 0.15s ease;

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
        background: ${(props) => props.theme.tabs.secondary.active.bg};

        &:hover {
          background: ${(props) => props.theme.tabs.secondary.active.bg} !important;
        }
      }
    }
  }

  section.tab-panel {
    min-height: 70vh;
    overflow-y: auto;
    flex-grow: 1;
    padding: 12px;
  }

  input[type="checkbox"],
  input[type="radio"] {
    accent-color: ${(props) => props.theme.workspace.accent};
    cursor: pointer;
  }

  .textbox {
    line-height: 1.5;
    padding: 0.45rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.text};

    &:focus {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
      outline: none !important;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
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
