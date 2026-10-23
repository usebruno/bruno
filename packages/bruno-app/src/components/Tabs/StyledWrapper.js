import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tabs-list {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    height: 2rem;
    gap: 0.25rem;
  }

  .tabs-list-measure {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    gap: 0.25rem;
    visibility: hidden;
    pointer-events: none;
  }

  .tab-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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

  .tabs-overflow-trigger {
    padding: 6px;
  }
`;

export default StyledWrapper;
