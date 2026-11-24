import styled from 'styled-components';
import { mix } from 'polished';

const StyledWrapper = styled.div`
  .error-row-line {
    position: sticky;
    top: 0;
    display: flex;
    align-items: center;
    min-height: 1.875rem;
    border-top: 1px solid ${(props) => props.theme.border.border0};
    /* 5px is the .scrollbar-hover gutter, so row actions line up with the header's */
    padding-right: calc(0.5rem - 5px);
    background-color: ${(props) => props.theme.background.base};

    &:hover {
      background-color: ${(props) => mix(0.04, props.theme.text, props.theme.background.base)};
    }
  }

  &.expanded > .error-row-line {
    background-color: ${(props) => mix(0.06, props.theme.text, props.theme.background.base)};
  }

  .error-row-toggle {
    all: unset;
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3125rem 0.5rem 0.3125rem 0.75rem;
    cursor: pointer;

    &:focus-visible {
      outline: 1px solid ${(props) => props.theme.input.focusBorder};
      outline-offset: -1px;
    }
  }

  .error-row-chevron {
    display: inline-flex;
    justify-content: center;
    width: 1rem;
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .error-row-label {
    flex-shrink: 0;
    font-weight: 500;
    white-space: nowrap;
  }

  .error-row-preview {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .error-details {
    padding: 0.625rem 0.75rem 0.625rem 2.25rem;
  }
`;

export default StyledWrapper;
