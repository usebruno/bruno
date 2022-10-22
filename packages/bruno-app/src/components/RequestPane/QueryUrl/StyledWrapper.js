import styled from 'styled-components';

const Wrapper = styled.div`
  height: 2.3rem;

  div.method-selector-container {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;
  }

  div.input-container {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;

    input {
      background-color: ${(props) => props.theme.requestTabPanel.url.bg};
      outline: none;
      box-shadow: none;

      &:focus {
        outline: none !important;
        box-shadow: none !important;
      }
    }
  }

  .caret {
    color: rgb(140, 140, 140);
    fill: rgb(140 140 140);
    position: relative;
    top: 1px;
  }
`;

export default Wrapper;
