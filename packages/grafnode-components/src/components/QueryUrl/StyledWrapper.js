import styled from 'styled-components';

const Wrapper = styled.div`
  height: 2.3rem;

  div.method-selector {
    border: solid 1px #cfcfcf;
    border-right: none;
  }

  div.input-container {
    border: solid 1px #cfcfcf;

    input {
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
