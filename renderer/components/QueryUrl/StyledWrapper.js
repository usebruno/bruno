import styled from 'styled-components';

const Wrapper = styled.div`
  height: 2.3rem;

  div.method-selector {
    border: solid 1px var(--color-layout-border);
    border-right: none;
    background-color: var(--color-sidebar-background);
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;
  }

  div.input-container {
    border: solid 1px var(--color-layout-border);
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
`;

export default Wrapper;
