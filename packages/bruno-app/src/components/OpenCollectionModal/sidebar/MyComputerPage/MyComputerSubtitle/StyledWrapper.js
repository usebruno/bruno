import styled, { keyframes } from 'styled-components';
import iconButtonStyles from '../../../components/IconButtonStyles';

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const StyledWrapper = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  min-height: 1.5rem;

  .subtitle-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .subtitle-manage {
    flex: none;
  }

  .subtitle-rescan {
    width: 1.25rem;
    height: 1.25rem;
    ${iconButtonStyles}
    border-radius: ${(props) => props.theme.border.radius.sm};

    &[aria-disabled='true'] {
      cursor: default;
      background: none;
      color: ${(props) => props.theme.colors.text.muted};
    }

    .is-spinning {
      animation: ${spin} 0.9s linear infinite;
    }
  }
`;

export default StyledWrapper;
