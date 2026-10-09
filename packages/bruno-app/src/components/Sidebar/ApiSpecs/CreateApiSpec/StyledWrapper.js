import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .api-spec-file-extension {
    color: ${(props) => props.theme.colors.text.darkOrange};
  }

  /* Small enough to sit inside the modal rather than spilling past its edge. */
  .api-spec-hint-tooltip {
    max-width: 12.5rem;
    padding: 0.25rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.3;
    border-radius: 0.25rem;
  }

  .collection-source-control {
    [role='radiogroup'] {
      height: 1.875rem;
      margin-top: 0.75rem;
      padding: 2px;
      gap: 2px;
      box-sizing: border-box;
      background: ${(props) => rgba(props.theme.modal.title.color, 0.1)};
      border-radius: ${(props) => props.theme.border.radius.md};
    }

    .segment {
      padding: 0 0.65rem;
      font-size: ${(props) => props.theme.font.size.sm};
      font-weight: 500;
      color: ${(props) => props.theme.text};
      border-radius: calc(${(props) => props.theme.border.radius.md} - 3px);
    }

    .segment.active {
      color: ${(props) => props.theme.button2.color.secondary.text};
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
    }
  }

  .textbox,
  .collection-select-trigger {
    height: 2.1rem;
    box-sizing: border-box;
  }

  .collection-select-trigger {
    gap: 0.5rem;
    padding: 0.3rem 0.6rem;
    border-radius: 0.1875rem;
    background-color: ${(props) => props.theme.input.bg};
    border: 0.0625rem solid ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.text};
    transition: border-color ease-in-out 0.1s;
    font: inherit;
    appearance: none;

    &:focus-visible,
    &[aria-expanded='true'] {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    .placeholder {
      color: ${(props) => props.theme.input.placeholder.color};
      opacity: ${(props) => props.theme.input.placeholder.opacity};
    }

    .caret {
      color: ${(props) => props.theme.colors.text.muted};
      flex-shrink: 0;
    }
  }
`;

export default StyledWrapper;
