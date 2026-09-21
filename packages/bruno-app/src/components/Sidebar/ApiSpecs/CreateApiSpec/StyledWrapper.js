import styled from 'styled-components';

const StyledWrapper = styled.div`
  && .bruno-modal-card {
    width: 610px;
  }

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

  .advanced-settings-toggle {
    color: ${(props) => props.theme.textLink};
    font-weight: 600;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
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
