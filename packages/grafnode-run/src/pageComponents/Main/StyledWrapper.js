import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 100vh;

  aside {
    min-width: 230px;
    width: 230px;
    border-right: solid 1px var(--color-layout-border);
    background-color: #F6F8FA;
  }

  section.main {
    display: flex;

    section.request-pane, section.response-pane {
    }
  }

  div.drag-request {
    display: flex;
    width: 1px;
    padding: 0;
    cursor: col-resize;
    background: var(--color-request-dragbar-background);

    &:hover {
      background: silver;
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
