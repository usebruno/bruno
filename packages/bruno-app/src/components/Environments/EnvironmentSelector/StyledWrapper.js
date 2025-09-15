import styled from 'styled-components';

const Wrapper = styled.div`
  .current-environment {
    border-radius: 0.9375rem;
    padding: 0.25rem 0.5rem 0.25rem 0.75rem;
    user-select: none;
    background-color: transparent;
    border: 1px solid ${(props) => props.theme.dropdown.selectedColor};
    line-height: 1rem;

    .caret {
      margin-left: 0.25rem;
      color: rgb(140, 140, 140);
      fill: rgb(140, 140, 140);
    }

    .env-icon {
      margin-right: 0.25rem;
      color: ${(props) => props.theme.dropdown.selectedColor};
    }

    .env-text {
      color: ${(props) => props.theme.dropdown.selectedColor};
      font-size: 0.875rem;
    }

    .env-separator {
      color: #8C8C8C;
      margin: 0 0.25rem;
      opacity: 0.7;
    }

    .env-text-inactive {
      color: ${(props) => props.theme.dropdown.color};
      font-size: 0.875rem;
      opacity: 0.7;
    }

    &.no-environments {
      background-color: ${(props) => props.theme.sidebar.badge.bg};
      border: 1px solid transparent;
      color: ${(props) => props.theme.dropdown.secondaryText};
    }
  }

  .tippy-box {
    min-width: 11.875rem;
    min-height: 15.0625rem;
    font-size: 0.8125rem;
    position: relative;
  }

  .tippy-box .tippy-content {
    padding: 0;

    .dropdown-item {
      display: flex;
      align-items: center;
      padding: 0.35rem 0.6rem;
      cursor: pointer;
      font-size: 0.8125rem;
      color: ${(props) => props.theme.dropdown.primaryText};

      &:hover:not(:disabled) {
        background-color: ${(props) => props.theme.dropdown.hoverBg};
      }

      &.active {
        background-color: ${(props) => props.theme.dropdown.selectedBg};
        color: ${(props) => props.theme.dropdown.selectedColor};
      }

      &.no-environment {
        color: ${(props) => props.theme.dropdown.mutedText};
      }
    }
  }

  .configure-button {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: ${(props) => props.theme.dropdown.bg};
    border-top: 0.0625rem solid ${(props) => props.theme.dropdown.separator};
    z-index: 10;
    margin: 0;

    button {
      color: ${(props) => props.theme.dropdown.primaryText};
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      gap: 0.5rem;
    }
  }

  .tab-button {
    color: var(--color-tab-inactive);
    font-size: 0.8125rem;

    .tab-content-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.125rem;
    }

    &.active {
      color: ${(props) => props.theme.tabs.active.color};
      border-bottom: solid 0.125rem ${(props) => props.theme.tabs.active.border};
    }
  }

  .environment-list {
    max-height: 75vh;
    overflow-y: auto;
  }


  .empty-state {
    max-width: 20rem;
    margin: 0 auto;
    padding: 0.35rem 0.6rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 12.5rem;

    h3 {
      color: ${(props) => props.theme.dropdown.primaryText};
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }

    p {
      color: ${(props) => props.theme.dropdown.primaryText};
      opacity: 0.75;
      font-size: 0.6875rem;
      line-height: 1.5;
      margin-bottom: 1rem;
      max-width: 11.875rem;
      margin: 0 auto;
      margin-bottom: 1rem;
    }

    .space-y-2 {
      width: 100%;
      align-self: stretch;
    }

    .space-y-2 > button {
      border: 0.0625rem solid ${(props) => props.theme.dropdown.primaryText};
      background: transparent;
      color: ${(props) => props.theme.dropdown.primaryText};
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      width: 100%;
      margin-bottom: 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;

      &:hover {
        background-color: ${(props) => props.theme.dropdown.hoverBg};
      }

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .no-collection-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    color: ${(props) => props.theme.dropdown.primaryText};
    font-size: 0.8125rem;
    line-height: 1.5;
    text-align: center;
    opacity: 0.75;

    svg {
      margin: 0 auto 1rem auto;
      color: ${(props) => props.theme.dropdown.primaryText};
      opacity: 0.5;
    }
  }
`;

export default Wrapper;