import styled from "styled-components";

const Wrapper = styled.div`
  background-color: rgb(44, 44, 44);
  color: rgba(255, 255, 255, 0.5);
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
