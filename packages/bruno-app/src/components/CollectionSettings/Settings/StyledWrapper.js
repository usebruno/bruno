import styled from 'styled-components';

const StyledWrapper = styled.div`
  .settings-sidebar {
    width: 200px;
    min-width: 200px;
    height: 100%;
    overflow-y: auto;
    /* 8px here + 8px row padding = 16px, so "General" lines up with the first tab */
    padding: 12px 8px 16px;
    border-right: 1px solid ${(props) => props.theme.border.border0};
  }

  .settings-group-label {
    padding: 4px 8px 6px 12px;
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.colors.text.muted};
    user-select: none;
  }

  /* Matches .environment-item in the Environments sidebar */
  .settings-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 1.6rem;
    padding: 0 8px 0 12px;
    margin-bottom: 1px;
    border: none;
    border-radius: 6px;
    background: transparent;
    font-size: ${(props) => props.theme.font.size.base};
    text-align: left;
    color: ${(props) => props.theme.text};
    cursor: pointer;
    user-select: none;
    transition: background 0.15s ease;

    .settings-item-icon {
      flex-shrink: 0;
      color: ${(props) => props.theme.colors.text.subtext2};
    }

    /* No flex-grow, so the change dot sits right after the text */
    .settings-item-label {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Change dot: pull it in from the 8px row gap so it hugs the text, as on the tabs */
    > sup {
      margin-left: -6px;
    }

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    &.active {
      background: ${(props) => props.theme.sidebar.collection.item.bg};
      color: ${(props) => props.theme.text};
      font-weight: 500;
    }

    &:focus {
      outline: none;
    }

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.brand};
      outline-offset: -2px;
    }
  }

  .settings-content {
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow: auto;
    /* 24px gutter after the sidebar border; 16px top keeps the first title level with "General" */
    padding: 16px 24px;
  }
`;

export default StyledWrapper;
