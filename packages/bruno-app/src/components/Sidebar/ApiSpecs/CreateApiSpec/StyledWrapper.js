import styled from 'styled-components';

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
      padding: 0.125rem;
      gap: 0.125rem;
      box-sizing: border-box;
      border-radius: 0.375rem;
      margin-top: 1.125rem;
    }

    .segment {
      height: 1.625rem;
      box-sizing: border-box;
      justify-content: center;
      padding: 0.3125rem 0.5rem;
      border-radius: 0.309375rem;
    }

    .segment-label {
      line-height: 1rem;
      white-space: nowrap;
    }

    .segment.active {
      background: ${(props) => props.theme.modal.body.bg};
      border: 0.0625rem solid ${(props) => props.theme.input.border};
      box-shadow: none;
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

    &:hover {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &:focus-visible {
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
