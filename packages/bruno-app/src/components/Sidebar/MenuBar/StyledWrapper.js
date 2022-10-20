import styled from 'styled-components';

const Wrapper = styled.div`
  background-color:  ${(props) => props.theme.menubar.bg};
  color: rgba(255, 255, 255, 0.4);
  min-height: 100vh;

  .menu-item {
    padding: 0.6rem;
    cursor: pointer;

    &:hover,
    &.active {
      color: rgba(255, 255, 255);
    }
  }
`;

export default Wrapper;
