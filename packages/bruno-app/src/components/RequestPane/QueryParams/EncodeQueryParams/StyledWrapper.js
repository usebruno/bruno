import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 0.8125rem;

  .label-item {
    color: ${(props) => props.theme.colors.text.yellow};
  }
`;

export default Wrapper;
