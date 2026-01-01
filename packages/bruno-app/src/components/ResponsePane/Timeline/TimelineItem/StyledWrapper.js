import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .timeline-item {
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
    padding: 0.5rem 0;

    &--oauth2 {
      border-bottom: 1px solid ${(props) => props.theme.border.border1};
    }
  }

  .timeline-item-header {
    position: relative;
    cursor: pointer;
  }

  .timeline-item-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-width: 0;
  }

  .timeline-item-header-items {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .timeline-item-url {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 0.25rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .timeline-item-timestamp {
    color: ${(props) => props.theme.colors.text.muted};
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .timeline-item-timestamp-iso {
    opacity: 0.7;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .timeline-item-oauth-label {
    opacity: 0.5;
    color: ${(props) => props.theme.text};
  }

  .timeline-item-content {
    overflow: hidden;
  }

  .timeline-item-tabs {
    display: flex;
    margin-bottom: 1rem;
  }

  .timeline-item-tab {
    margin-right: 1rem;
    position: relative;
    padding: 0.5rem 1rem;
    color: ${(props) => props.theme.colors.text.muted};
    background: none;
    border: none;
    cursor: pointer;
    font-size: ${(props) => props.theme.font.size.base};

    &--active {
      color: ${(props) => props.theme.tabs.active.color};
      
      &:after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: ${(props) => props.theme.tabs.active.border};
      }
    }
  }

  .timeline-item-tab-content {
    word-break: break-all;
  }

  .timeline-item-metadata {
    color: ${(props) => props.theme.colors.text.muted};
    margin-left: 0.5rem;
    font-size: ${(props) => props.theme.font.size.base};
  }

  .collapsible-section {
    .section-header {
      cursor: pointer;
      pre {
        color: ${(props) => rgba(props.theme.primary.solid, 0.8)};
      }
    }
  }
`;

export default StyledWrapper;
