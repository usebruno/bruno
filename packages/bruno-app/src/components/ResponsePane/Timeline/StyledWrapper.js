import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  overflow-y: auto;
  height: 100%;
  flex: 1;

  .timeline-container {
    flex: 1;
  }

  .timeline-filter-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 0;
    flex-wrap: wrap;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
    margin-bottom: 4px;
  }

  .timeline-chip {
    padding: 4px 10px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    transition: color 0.1s ease, background-color 0.1s ease;

    &:hover {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.bg2 || 'rgba(255, 255, 255, 0.04)'};
    }

    &.is-active {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.bg2 || 'rgba(255, 255, 255, 0.06)'};
    }
  }

  .timeline-chip-count {
    color: ${(props) => props.theme.colors.text.muted};
    opacity: 0.6;
    font-size: 11px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .timeline-chip.is-active .timeline-chip-count {
    color: ${(props) => props.theme.tabs.active.border};
    opacity: 1;
  }

  .timeline-event {
    cursor: pointer;
  }
`;

export default StyledWrapper;
