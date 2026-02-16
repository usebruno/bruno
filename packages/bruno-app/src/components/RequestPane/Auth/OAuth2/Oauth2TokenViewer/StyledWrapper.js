import styled from 'styled-components';
import { rgba } from 'polished';

const Wrapper = styled.div`
  .oauth2-copy-button {
    background-color: ${(props) => rgba(props.theme.primary.solid, 0.1)};
    
    &:hover {
      background-color: ${(props) => rgba(props.theme.primary.solid, 0.2)};
    }
  }

  ol[role="tree"] {
    overflow: hidden;
  }
  ol[role="group"] span {
    line-break: anywhere;
  }
`;

export default Wrapper;
