import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tabs-container {
    padding: 0.5rem 0;
    gap: 0.25rem;
    flex-wrap: nowrap;
    overflow: visible;
  }

  .tabs-visible {
    display: flex;
    gap: 0.25rem;
    flex-wrap: nowrap;
  }

  div.tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border: none;
    border-radius: 8px;
    background-color: transparent;
    color: ${(props) => props.theme.tabs.inactive?.color || '#616161'};
    cursor: pointer;
    white-space: nowrap;
    font-size: 0.8125rem;
    font-weight: 400;
    line-height: 1.25rem;
    transition: background-color 0.15s ease, color 0.15s ease;
    position: relative;

    &:hover {
      background-color: ${(props) => props.theme.tabs.hover?.bg || 'rgba(0, 0, 0, 0.05)'};
      color: ${(props) => props.theme.tabs.hover?.color || '#202223'};
    }

    &:focus,
    &:active,
    &:focus-within,
    &:focus-visible {
      outline: none;
    }

    &:focus-visible {
      box-shadow: 0 0 0 2px ${(props) => props.theme.tabs.focus?.outline || '#0052CC33'};
    }

    &.active {
      background-color: ${(props) => props.theme.tabs.active?.bg || '#F6F6F7'};
      color: ${(props) => props.theme.tabs.active?.color || '#202223'};
      font-weight: 400;
    }

    .tab-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.125rem;
      height: 1.125rem;
      padding: 0 0.25rem;
      border-radius: 0.5rem;
      background-color: ${(props) => props.theme.tabs.badge?.bg || '#E1E3E5'};
      color: ${(props) => props.theme.tabs.badge?.color || '#616161'};
      font-size: 0.6875rem;
      font-weight: 500;
      line-height: 1;
    }

    &.active .tab-badge {
      background-color: ${(props) => props.theme.tabs.active?.badge?.bg || '#8C9196'};
      color: ${(props) => props.theme.tabs.active?.badge?.color || '#fff'};
    }

    .content-indicator {
      color: ${(props) => props.theme.text};
    }
  }

  .tab-overflow-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.375rem 0.75rem;
    border: none;
    border-radius: 8px;
    background-color: transparent;
    color: ${(props) => props.theme.tabs.inactive?.color || '#616161'};
    cursor: pointer;
    white-space: nowrap;
    font-size: 0.8125rem;
    font-weight: 400;
    line-height: 1.25rem;
    transition: background-color 0.15s ease, color 0.15s ease;
    position: relative;

    &:hover {
      background-color: ${(props) => props.theme.tabs.hover?.bg || 'rgba(0, 0, 0, 0.05)'};
      color: ${(props) => props.theme.tabs.hover?.color || '#202223'};
    }

    &.active {
      background-color: ${(props) => props.theme.tabs.active?.bg || '#F6F6F7'};
      color: ${(props) => props.theme.tabs.active?.color || '#202223'};
      font-weight: 400;
    }

    svg {
      margin-left: 0;
    }
  }

  .tab-overflow-dropdown {
    position: absolute;
    top: calc(100% + 0.25rem);
    right: 0;
    min-width: 140px;
    background: ${(props) => props.theme.dropdown.bg};
    border-radius: 8px;
    box-shadow: ${(props) => props.theme.dropdown.shadow};
    padding: 0.25rem;
    z-index: 1000;
    max-height: 320px;
    overflow-y: auto;
  }

  .tab-overflow-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.250rem 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    color: ${(props) => props.theme.dropdown.color};
    font-size: 0.8125rem;
    font-weight: 400;
    line-height: 1.25rem;
    transition: background-color 0.15s ease;
    gap: 0.5rem;

    &:hover {
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }

    &:active {
      background-color: ${(props) => props.theme.dropdown.selectedBg || '#F6F6F7'};
    }

    &.active {
      background-color: ${(props) => props.theme.dropdown.selectedBg || '#F6F6F7'};
      font-weight: 400;
      color: ${(props) => props.theme.dropdown.selectedColor || '#202223'};
    }

    > span:first-child {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.125rem;
      height: 1.125rem;
      padding: 0 0.25rem;
      border-radius: 0.5rem;
      background-color: ${(props) => props.theme.badge?.bg || '#E1E3E5'};
      color: ${(props) => props.theme.badge?.color || '#616161'};
      font-size: 0.6875rem;
      font-weight: 500;
      line-height: 1;
    }
  }
`;

export default StyledWrapper;
