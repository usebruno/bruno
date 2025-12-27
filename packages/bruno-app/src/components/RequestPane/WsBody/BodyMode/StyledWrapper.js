import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.base};

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
      color: ${(props) => props.theme.brand};
    }
  }

  .caret {
    color: ${(props) => props.theme.colors.text.muted};
    fill: ${(props) => props.theme.colors.text.muted};
  }
`;

export default Wrapper;
