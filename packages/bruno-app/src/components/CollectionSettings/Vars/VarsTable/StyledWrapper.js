import styled from 'styled-components';

const Wrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 500;
    table-layout: fixed;

    thead,
    td {
      border: 1px solid ${(props) => props.theme.table.border};
    }

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: ${(props) => props.theme.font.size.base};
      user-select: none;
    }
    td {
      padding: 6px 10px;

      &:nth-child(1) {
        width: 30%;
      }

      &:nth-child(3) {
        width: 70px;
      }
    }
  }

  /* Relax EditableTable's 35px row pin so multi-line values render fully. */
  tbody tr,
  tbody tr td {
    height: auto !important;
    max-height: none !important;
  }
  tbody tr td {
    overflow: visible !important;
    white-space: normal !important;
  }
  tbody tr td > div:not(.drag-handle) {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }

  .btn-add-var {
    font-size: ${(props) => props.theme.font.size.base};
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
