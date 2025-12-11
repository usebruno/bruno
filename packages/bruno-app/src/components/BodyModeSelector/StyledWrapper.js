import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.base};

  .body-mode-selector {
    background: transparent;
    border-radius: 3px;

    .dropdown-item {
      padding: 0.2rem 0.6rem !important;
      padding-left: 1.5rem !important;
      display: flex;
      align-items: center;
    }

    .label-item {
      padding: 0.2rem 0.6rem !important;
    }

    .selected-body-mode {
      color: ${(props) => props.theme.colors.text.yellow};
    }

    .dropdown-icon {
      display: flex;
      align-items: center;
      margin-right: 0.5rem;
    }
  }

  .caret {
    color: rgb(140, 140, 140);
    fill: rgb(140 140 140);
  }
`;

export default StyledWrapper;
