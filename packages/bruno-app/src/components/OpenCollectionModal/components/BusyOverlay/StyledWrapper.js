import styled, { keyframes } from 'styled-components';
import { rgba } from 'polished';

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

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

  .busy-spinner {
    animation: ${spin} 0.9s linear infinite;
  }

  .busy-label {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .busy-cancel {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: ${(props) => props.theme.textLink};
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export default StyledWrapper;
