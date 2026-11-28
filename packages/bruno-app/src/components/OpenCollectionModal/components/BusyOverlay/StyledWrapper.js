import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  background: ${(props) => rgba(props.theme.bg, 0.7)};
  font-size: ${(props) => props.theme.font.size.base};
  color: ${(props) => props.theme.colors.text.muted};

  .busy-label {
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;

export default StyledWrapper;
