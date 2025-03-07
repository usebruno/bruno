import styled from 'styled-components';

const Wrapper = styled.div`
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

  .scroll-box {
    max-height: 500px;
    overflow-y: auto;

    background:
    /* Shadow Cover TOP */
    linear-gradient(
      ${(props) => props.theme.modal.body.bg} 20%,
      rgba(255, 255, 255, 0)
    ) center top,
    
    /* Shadow Cover BOTTOM */
    linear-gradient(
      rgba(255, 255, 255, 0),
      ${(props) => props.theme.modal.body.bg} 80%
    ) center bottom,
    
    /* Shadow TOP */
    linear-gradient(
      rgba(0, 0, 0, 0.1) 0%,
      rgba(0, 0, 0, 0) 100%
    ) center top,
    
    /* Shadow BOTTOM */
    linear-gradient(
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0.1) 100%
    ) center bottom;

    background-repeat: no-repeat;
    background-size: 100% 30px, 100% 30px, 100% 10px, 100% 10px;
    background-attachment: local, local, scroll, scroll;
  }
`;

export default Wrapper;
