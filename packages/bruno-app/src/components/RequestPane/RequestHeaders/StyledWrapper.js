import styled from 'styled-components';

const Wrapper = styled.div`
  .mousetrap {
    position: relative;
  }
  .suggestions {
    z-index: 99;
    position: absolute;
    left: 10px;
    background-color: white;
    border: 1px solid #ececec;
    border-top-width: 0;
    list-style: none;
    font-weight: 500;
    margin-top: 0;
    max-height: 143px;
    max-width: 17rem;
    overflow-y: auto;
    padding-left: 0;
    width: 100%;
  }

  .suggestion-active,
  .suggestions li:hover {
    background-color: #d6d6d6;
    cursor: pointer;
    font-weight: 600;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 600;

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
    }
  }

  .btn-add-header {
    font-size: 0.8125rem;
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
