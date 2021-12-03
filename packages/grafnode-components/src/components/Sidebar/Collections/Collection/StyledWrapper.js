import styled from 'styled-components';

const Wrapper = styled.div`
  .collection-name {
    height: 1.875rem;
    cursor: pointer;
    user-select: none;
    padding-left: 8px;
    padding-right: 8px;

    .rotate-90 {
      transform: rotateZ(90deg);
    }

    &:hover {
      background:#ededed;
    }
  }
`;

export default Wrapper;
