import styled from 'styled-components';

const Wrapper = styled.div`
  .current-environment {
  }
  .environment-active {
    padding: 0.3rem 0.4rem;
    color: ${(props) => props.theme.colors.text.yellow};
    border: solid 1px ${(props) => props.theme.colors.text.yellow} !important;
  }
  .environment-selector {
    .active: {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }
`;

export default Wrapper;
