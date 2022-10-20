import styled from "styled-components";

const StyledWrapper = styled.div`
  div.method-selector-container {
    border: solid 1px var(--color-layout-border);
    border-right: none;
    background-color: var(--color-sidebar-background);
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;

    .method-selector {
      min-width: 80px;
    }
  }

  div.method-selector-container,
  div.input-container {
    height: 2.3rem;
  }

  div.input-container {
    border: solid 1px var(--color-layout-border);
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;

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

export default StyledWrapper;
