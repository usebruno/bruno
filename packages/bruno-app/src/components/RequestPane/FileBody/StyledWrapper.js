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
        width: 25%;
      }

      &:nth-child(2) {
        width: 20%;
      }

      &:nth-child(3) {
        width: 10%;
      }

      &:nth-child(4) {
        width: 35%;
      }

      &:nth-child(5) {
        width: 70px;
      }
    }


    thead td div {
      max-width: 100px;
      text-overflow: ellipsis; 
      overflow: hidden;   
      white-space: nowrap;
    }
  }

  .btn-add-param {
    font-size: ${(props) => props.theme.font.size.base};
  }

  input[type='text'] {
    width: 100%;
    border: solid 1px transparent;
    outline: none !important;
    color: ${(props) => props.theme.table.input.color};
    background: transparent;

    &:focus {
      outline: none !important;
      border: solid 1px transparent;
    }
  }

  input[type='radio'] {
    cursor: pointer;
    position: relative;
    top: 1px;
    accent-color: ${(props) => props.theme.primary.solid};
  }
`;

export default Wrapper;
