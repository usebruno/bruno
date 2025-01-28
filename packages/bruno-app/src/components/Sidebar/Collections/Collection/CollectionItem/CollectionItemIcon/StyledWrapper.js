import styled from 'styled-components';

const Wrapper = styled.div`
  .partial {
    color: ${(props) => props.theme.colors.text.yellow};
  }
  .error {
    color: ${(props) => props.theme.colors.text.danger};
  }
`;

export default Wrapper;
