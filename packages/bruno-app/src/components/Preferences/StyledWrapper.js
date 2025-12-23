import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.tabs {
    padding: 8px;
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

  input[type="checkbox"],
  input[type="radio"] {
    accent-color: ${(props) => props.theme.workspace.accent};
    cursor: pointer;
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
