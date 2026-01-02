import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tabs-list {
    display: inline-flex;
    height: 2rem;
    width: fit-content;
    justify-content: center;
    gap: 0.25rem;
  }

  .tab-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    padding: 8px;
    font-size: 0.75rem;
    white-space: nowrap;
    cursor: pointer;
    border: 1px solid transparent;
    background: transparent;
    color: ${(props) => props.theme.tabs.secondary.inactive.color};
    transition: all 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.tabs.secondary.inactive.bg};
    }

    &.active {
      background: ${(props) => props.theme.tabs.secondary.active.bg};
      color: ${(props) => props.theme.tabs.secondary.active.color};
    }
  }
`;

export default StyledWrapper;
