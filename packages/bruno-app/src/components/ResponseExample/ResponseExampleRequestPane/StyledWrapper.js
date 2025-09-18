import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-size: 0.8125rem;

  .body-mode-selector {
    background: transparent;
    border-radius: 3px;

    .dropdown-item {
      padding: 0.2rem 0.6rem !important;
      padding-left: 1.5rem !important;
    }

    .label-item {
      padding: 0.2rem 0.6rem !important;
    }

    .selected-body-mode {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }

  .caret {
    color: rgb(140, 140, 140);
    fill: rgb(140 140 140);
  }

`;

export default StyledWrapper;
