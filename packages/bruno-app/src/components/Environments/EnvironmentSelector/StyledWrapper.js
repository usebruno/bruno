import styled from 'styled-components';

const Wrapper = styled.div`
  .current-environment {
    background-color: ${(props) => props.theme.sidebar.badge.bg};
    border-radius: 15px;

    .caret {
      margin-left: 4px;
      color: rgb(140, 140, 140);
      fill: rgb(140, 140, 140);
    }

    .env-icon {
      margin-right: 4px;
    }

    .env-text {
      color: ${(props) => props.theme.colors.text.yellow};
      font-size: 14px;
      font-weight: 500;
    }

    .env-separator {
      color: #8C8C8C;
      margin: 0 4px;
      opacity: 0.7;
    }

    .env-text-inactive {
      color: ${(props) => props.theme.dropdown.color};
      font-size: 14px;
      opacity: 0.7;
    }
  }

  .tippy-box {
    min-width: 270px !important;
    min-height: 315px !important;
    font-size: 13px;
    position: relative;
  }

  .tippy-box .tippy-content {
    padding: 0;

    .dropdown-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 13px;

      &:hover:not(:disabled) {
        background-color: rgba(128, 128, 128, 0.1) !important;
      }
    }
  }

  .configure-button {
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    background-color: ${(props) => props.theme.dropdown.bg} !important;
    border-top: 1px solid ${(props) => props.theme.dropdown.separator} !important;
    z-index: 10 !important;
    margin: 0 !important;
  }

  .tab-header {
    border-bottom: 1px solid ${(props) => props.theme.dropdown.separator};
  }

  .tab-button {
    white-space: nowrap;
    padding: 12px 12px;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.dropdown.color || '#9ca3af'};
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    font-size: 13px;
    font-weight: 500;

    &:hover {
      color: ${(props) => props.theme.colors.text.normal};
      background-color: rgba(128, 128, 128, 0.1);
    }

    .tab-content-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &.active {
      color: ${(props) => props.theme.colors.text.normal};

      .tab-content-wrapper::after {
        content: '';
        position: absolute;
        bottom: -11px;
        left: 0;
        right: 0;
        height: 2px;
        background: #ffffff;
        border-radius: 2px 2px 0 0;
      }
    }
  }

  .environment-list {
    max-height: 50vh;
    overflow-y: auto;
  }

  .check-icon-container {
    background-color: ${(props) => props.theme.colors.text.yellow};
    border-radius: 50%;
    width: 13px;
    height: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;
  }

  .check-icon {
    color: ${(props) => props.theme.sidebar.bg};
  }

  .empty-state {
    max-width: 320px;
    margin: 0 auto;
    padding: 40px 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;

    h3 {
      color: ${(props) => props.theme.dropdown.color};
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    p {
      color: ${(props) => props.theme.dropdown.color};
      opacity: 0.75;
      font-size: 11px;
      line-height: 1.5;
      margin-bottom: 16px;
      max-width: 208px;
      margin: 0 auto;
      margin-bottom: 16px;
    }

    .space-y-2 {
      width: 100%;
      align-self: stretch;
    }

    .space-y-2 > button {
      border: 1px solid ${(props) => props.theme.dropdown.separator};
      background: transparent;
      color: ${(props) => props.theme.dropdown.color};
      padding: 8px 16px;
      border-radius: 6px;
      width: 100%;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;

      &:hover {
        background-color: rgba(128, 128, 128, 0.1);
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
    padding: 32px 16px;
    color: ${(props) => props.theme.dropdown.color};
    font-size: 13px;
    line-height: 1.5;
    text-align: center;
    opacity: 0.75;
  }
`;

export default Wrapper;