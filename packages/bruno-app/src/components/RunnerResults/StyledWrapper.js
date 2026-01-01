import styled from 'styled-components';

const Wrapper = styled.div`
  .textbox {
    border: 1px solid #ccc;
    padding: 0.2rem 0.5rem;
    box-shadow: none;
    border-radius: 0px;
    outline: none;
    box-shadow: none;
    transition: border-color ease-in-out 0.1s;
    border-radius: 3px;
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};

    &:focus {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
      outline: none !important;
    }
  }

  .item-path {
    .link {
      color: ${(props) => props.theme.textLink};
    }
  }
  .danger {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .test-summary {
    color: ${(props) => props.theme.tabs.active.border};
  }

  /* test results */
  .test-success {
    color: ${(props) => props.theme.colors.text.green};
  }

  .test-failure {
    color: ${(props) => props.theme.colors.text.danger};

    .error-message {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }
  
  .skipped-request {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .button-sm {
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .run-config-panel, .run-config-option {
    border-color: ${(props) => props.theme.background.surface1};
  }

  .filter-bar {
    display: flex;
    align-items: stretch;
    border-radius: ${(props) => props.theme.border.radius.lg};
    border: 1px solid ${(props) => props.theme.border.border0};
    max-height: 35px;
    flex-shrink: 0;
    overflow: hidden;

    .filter-label {
      display: flex;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-top-left-radius: ${(props) => props.theme.border.radius.lg};
      border-bottom-left-radius: ${(props) => props.theme.border.radius.lg};
      background-color: ${(props) => props.theme.background.surface0};

      span {
        font-family: Inter, sans-serif;
        font-weight: 400;
        font-size: ${(props) => props.theme.font.size.sm};
        color: ${(props) => props.theme.colors.text.subtext1};
      }
    }

    .filter-buttons {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 0.5rem 0.75rem 0 0.75rem;
      border-top-right-radius: ${(props) => props.theme.border.radius.lg};
      border-bottom-right-radius: ${(props) => props.theme.border.radius.lg};
      background: transparent;
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

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.tabs.active.border};
      outline-offset: 2px;
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
`;

export default Wrapper;
