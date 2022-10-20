import styled from "styled-components";

const Wrapper = styled.div`
  height: 2.3rem;

  div.method-selector-container {
    background-color: var(--color-sidebar-background);
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;
  }

  div.input-container {
    background-color: var(--color-sidebar-background);
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;

    input {
      background-color: var(--color-sidebar-background);
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
