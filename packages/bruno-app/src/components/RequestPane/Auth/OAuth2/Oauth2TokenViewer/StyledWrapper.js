import styled from 'styled-components';

const Wrapper = styled.div`
  ol[role="tree"] {
    overflow: hidden;
  }
  ol[role="group"] span {
    line-break: anywhere;
  }
`;

export default Wrapper;
