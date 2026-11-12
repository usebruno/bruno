import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.125rem dashed ${(props) => props.theme.textLink};
  border-radius: ${(props) => props.theme.border.radius.md};
  background: ${(props) => rgba(props.theme.bg, 0.94)};
  text-align: center;
  pointer-events: none;

  .drop-overlay-content {
    max-width: 26.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .drop-overlay-icon {
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 1.5rem;
    background: ${(props) => props.theme.status.info.background};
    color: ${(props) => props.theme.textLink};
  }

  .drop-overlay-title {
    font-size: ${(props) => props.theme.font.size.lg};
    font-weight: 600;
  }

  .drop-overlay-text {
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.5;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
