import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  min-width: 0;
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
`;

export default Wrapper;
