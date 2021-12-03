import styled from 'styled-components';

const Wrapper = styled.div`
  .collection-item-name {
    height: 1.875rem;
    cursor: pointer;
    user-select: none;

    .rotate-90 {
      transform: rotateZ(90deg);
    }

    &.item-focused-in-tab, &:hover {
      background:#ededed;
    }
  }
`;

export default Wrapper;
