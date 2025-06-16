import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  flex: 1;

  &.is-dragging {
    cursor: col-resize !important;
  }

  section.main {
    display: flex;

    section.request-pane,
    section.response-pane {
    }
  }

  .fw-600 {
    font-weight: 600;
  }
`;

export default Wrapper;
