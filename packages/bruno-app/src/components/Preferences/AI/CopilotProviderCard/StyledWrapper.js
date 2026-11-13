import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .copilot-option-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    font-size: ${(props) => props.theme.font.size.sm};
    line-height: 1;
    color: ${(props) => props.theme.text};
    background: transparent;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.base};
    cursor: pointer;
    transition: border-color 0.15s ease, background-color 0.15s ease;

    &:hover:not(:disabled) {
      border-color: ${(props) => props.theme.accents.primary};
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px ${(props) => rgba(props.theme.accents.primary, 0.4)};
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }
  }

  .copilot-intro,
  .copilot-hint {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .copilot-code {
    font-family: var(--font-family-mono);
    font-size: ${(props) => props.theme.font.size.xl};
    font-weight: 600;
    letter-spacing: 2px;
    color: ${(props) => props.theme.text};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: ${(props) => props.theme.bg};
    user-select: all;
  }

  .copilot-account {
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: ${(props) => props.theme.input.bg};
  }

  .copilot-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
