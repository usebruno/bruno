import styled from 'styled-components';

const Wrapper = styled.div`
  height: 2.3rem;

  div.method-selector {
    border: solid 1px #cfcfcf;
    border-right: none;
    background-color: #f3f3f3;
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;
  }

  div.input-container {
    border: solid 1px #cfcfcf;
    background-color: #f3f3f3;
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;

    input {
      background-color: #f3f3f3;
      outline: none;
      box-shadow: none;

      &:focus {
        outline: none !important;
        box-shadow: none !important;
      }
    }
  }
`;

export default Wrapper;
