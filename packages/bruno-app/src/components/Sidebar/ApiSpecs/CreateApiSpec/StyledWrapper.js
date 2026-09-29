import styled from 'styled-components';

const StyledWrapper = styled.div`

  .api-spec-file-extension {
    color: ${(props) => props.theme.colors.text.darkOrange};
  }
  select {
    background: ${(props) => props.theme.bg};
  }
  option {
    background: ${(props) => props.theme.bg};
  }

  .input-icon {
    position: absolute;
    left: 0.5rem;
    top: 0;
    bottom: 0;
    width: 16px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    color: ${(props) => props.theme.colors.text.muted};
  }

  /* Small enough to sit inside the modal rather than spilling past its edge. */
  .api-spec-hint-tooltip {
    max-width: 200px;
    padding: 4px 8px;
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.3;
    border-radius: 4px;
  }

  .collection-source-control {
    [role='radiogroup'] {
      height: 30px;
      padding: 2px;
      gap: 2px;
      box-sizing: border-box;
      border-radius: 6px;
      margin-top: 18px;
    }

    .segment {
      height: 26px;
      box-sizing: border-box;
      justify-content: center;
      padding: 5px 8px;
      border-radius: 4.95px;
    }

    .segment-label {
      line-height: 16px;
      white-space: nowrap;
    }

    .segment.active {
      background: ${(props) => props.theme.modal.body.bg};
      border: 1px solid ${(props) => props.theme.input.border};
      box-shadow: none;
    }
  }

  .textbox,
  .collection-select-trigger {
    height: 2.1rem;
    box-sizing: border-box;
  }

  .collection-select-trigger {
    box-sizing: border-box;
    gap: 0.5rem;
    padding: 0.3rem 0.6rem;
    border-radius: 3px;
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
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
