import styled from 'styled-components';

const StyledWrapper = styled.div`
  &.filter-bar {
    display: flex;
    align-items: stretch;
    border-radius: ${(props) => props.theme.border.radius.base};
    border: 1px solid ${(props) => props.theme.border.border0};
    max-height: 35px;
    flex-shrink: 0;
    
    .filter-label {
      display: flex;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-top-left-radius: ${(props) => props.theme.border.radius.base};
      border-bottom-left-radius: ${(props) => props.theme.border.radius.base};
      background-color: ${(props) => props.theme.background.mantle};

      span {
        font-family: Inter, sans-serif;
        font-weight: 400;
        font-size: ${(props) => props.theme.font.size.sm};
        color: ${(props) => props.theme.colors.text.text};
        white-space: nowrap;
      }
    }

    .filter-buttons {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 0.5rem 0.75rem 0 0.75rem;
      border-top-right-radius: ${(props) => props.theme.border.radius.base};
      border-bottom-right-radius: ${(props) => props.theme.border.radius.base};
      background: transparent;
    }

    /* Wide by default: the button row is the control, the dropdown stands down. */
    .filter-select {
      display: none;
    }
  }

  /* Below the breakpoint the row cannot fit, so it swaps for the dropdown. The
     toolbar carries the class, the same way ResponsePaneActions keys off the
     expandable class set by ResponsiveTabs. */
  .compact &.filter-bar {
    .filter-buttons {
      display: none;
    }

    .filter-select {
      display: inline-flex;
    }
  }

  .filter-button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0;
    padding-bottom: 0.4rem;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    font-family: Inter, sans-serif;
    line-height: 100%;
    letter-spacing: 0%;
    cursor: pointer;
    transition: color 0.15s ease, border-bottom-color 0.15s ease;
    outline: none;
    white-space: nowrap;

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.tabs.active.border};
      outline-offset: 2px;
    }

    &.active {
      font-weight: ${(props) => props.theme.tabs.active.fontWeight};
      color: ${(props) => props.theme.tabs.active.color};
      border-bottom-color: ${(props) => props.theme.tabs.active.border};

      .filter-count {
        color: ${(props) => props.theme.tabs.active.color};
      }
    }

    &:not(.active) {
      font-weight: 500;
      color: ${(props) => props.theme.colors.text.subtext0};

      .filter-count {
        color: ${(props) => props.theme.colors.text.subtext0};
      }
    }
  }

  .filter-select {
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.75rem;
    border: none;
    border-top-right-radius: ${(props) => props.theme.border.radius.base};
    border-bottom-right-radius: ${(props) => props.theme.border.radius.base};
    background: transparent;
    font-family: Inter, sans-serif;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    line-height: 100%;
    color: ${(props) => props.theme.tabs.active.color};
    white-space: nowrap;
    cursor: pointer;
    outline: none;

    &:hover {
      background-color: ${(props) => props.theme.background.surface0};
    }

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.tabs.active.border};
      outline-offset: -2px;
    }
  }

  /* Menu row contents: check on the left, label, count pushed to the right. */
  .filter-check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    flex: none;
    color: ${(props) => props.theme.tabs.active.border};
  }

  .filter-option {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;
    width: 100%;
  }

  .filter-count {
    padding: 2px 4.5px;
    border-radius: 2px;
    border: 1px solid ${(props) => props.theme.border.border0};
    background-color: ${(props) => props.theme.background.surface0};
    font-family: Inter, sans-serif;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    line-height: 100%;
    letter-spacing: 0%;
    color: ${(props) => props.theme.colors.text.subtext0};
  }
`;

export default StyledWrapper;
