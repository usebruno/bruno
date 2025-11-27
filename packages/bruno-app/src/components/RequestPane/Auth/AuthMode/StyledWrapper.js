import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.base};

  .auth-mode-selector {
    background: transparent;

    .auth-mode-label {
      color: ${(props) => props.theme.colors.text.yellow};
    }

    .dropdown-item {
      padding: 0.2rem 0.6rem !important;
    }

    .label-item {
      padding: 0.2rem 0.6rem !important;
    }
  }

  .caret {
    color: rgb(140, 140, 140);
    fill: rgb(140 140 140);
  }
`;

export default Wrapper;
