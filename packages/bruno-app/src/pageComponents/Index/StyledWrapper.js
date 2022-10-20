import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 100vh;

  background-color: ${(props) => props.theme.theme['primary-theme']};

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

  .react-tabs {
    .react-tabs__tab-list {
      padding-left: 1rem;
      border-bottom: 1px solid #cfcfcf;

      .react-tabs__tab--selected {
        border-color: #cfcfcf;
      }
    }
  }

  .collection-filter {
    input {
      border: 1px solid rgb(211 211 211);
      border-radius: 2px;

      &:focus {
        outline: none;
      }
    }
  }
`;

export default Wrapper;
