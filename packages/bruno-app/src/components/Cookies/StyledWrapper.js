import styled from 'styled-components';

const Wrapper = styled.div`
  max-height: 500px;
  overflow-y: auto;

  .scroll-shadow {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;
  }

  table {
    width: 100%;
    table-layout: fixed;

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: 0.8125rem;
      user-select: none;
    }
  }

  .textbox {
    line-height: 1.42857143;
    border: 1px solid #ccc;
    padding: 0.45rem;
    box-shadow: none;
    border-radius: 0px;
    outline: none;
    box-shadow: none;
    transition: border-color ease-in-out 0.1s;
    border-radius: 3px;
    background-color: ${(props) => props.theme.modal.input.bg};
    border: 1px solid ${(props) => props.theme.modal.input.border};

    &:focus {
      border: solid 1px ${(props) => props.theme.modal.input.focusBorder} !important;
      outline: none !important;
    }
  }
`;

export default Wrapper;
