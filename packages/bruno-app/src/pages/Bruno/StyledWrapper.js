import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  flex: 1;
  border-top: 1px solid ${(props) => props.theme.sidebar.collection.item.hoverBg};

  &.is-dragging {
    cursor: col-resize !important;
  }

  section.main {
    display: flex;

    section.request-pane,
    section.response-pane {
      overflow: hidden;
    }
  }

  .fw-600 {
    font-weight: 500;
  }

  /* Islands layout (beta): sidebar and main panel float as separate cards on a canvas */
  &.layout-islands {
    border-top: none;
    gap: 8px;
    padding: 8px;
    background: ${(props) => props.theme.background.base};
    box-sizing: border-box;

    aside,
    > .main-panel {
      border-radius: ${(props) => props.theme.border.radius.lg};
      box-shadow: ${(props) => props.theme.shadow.md};
      border: 1px solid ${(props) => props.theme.border.border1};
      overflow: hidden;
    }
  }
`;

export default Wrapper;
