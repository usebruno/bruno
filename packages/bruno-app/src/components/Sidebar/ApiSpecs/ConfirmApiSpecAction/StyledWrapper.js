import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .warning-banner {
    color: ${(props) => props.theme.colors.text.muted};
    background-color: ${(props) => rgba(props.theme.colors.text.yellow, 0.1)};
    border: 1px solid ${(props) => rgba(props.theme.colors.text.yellow, 0.5)};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  .warning-icon {
    height: 1lh;
    color: ${(props) => props.theme.colors.text.yellow};
  }
`;

export default StyledWrapper;
