import styled from 'styled-components';

const Wrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 600;
    table-layout: fixed;

    thead,
    td {
      border: 1px solid ${(props) => props.theme.table.border};
    }

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: 0.8125rem;
      user-select: none;
    }
    td {
      padding: 6px 10px;

      &:nth-child(1) {
        width: 50px;
      }

      &:nth-child(2) {
        width: 30%;
      }

      &:nth-child(4) {
        width: 70px;
      }
    }
  }

  // Fixes overlay of draggable containing neighbouring elements
  .clip-codemirror:active {
    .CodeMirror {
      textarea {
        display: none;
      }
    }
    .CodeMirror-scroll {
      padding: 0 !important;
      margin: 0 !important;

      div:nth-last-child(2) {
        display: none;
      }
    }
  }

  .draggable-handle {
    cursor: grab;
    white-space: nowrap;
    text-align: center;

    &:active {
      cursor: grabbing;
    }
  }
  .dragging {
    background: ${(props) => props.theme.table.active.bg};
  }

  .btn-add-param {
    font-size: 0.8125rem;
    &:hover span {
      text-decoration: underline;
    }
  }

  input[type='text'] {
    width: 100%;
    border: solid 1px transparent;
    outline: none !important;
    background-color: inherit;

    &:focus {
      outline: none !important;
      border: solid 1px transparent;
    }
  }

  input[type='checkbox'] {
    cursor: pointer;
    position: relative;
    top: 1px;
  }
`;

export default Wrapper;
