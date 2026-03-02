import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;

  .visual-diff-content {
    flex: 1;
    overflow: auto;
    padding: 1rem;
  }

  .diff-header-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .diff-header-pane {
    flex: 1;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    padding: 0.5rem 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    background: ${(props) => props.theme.sidebar.bg};

    &.old {
      color: ${(props) => props.theme.colors.text.danger};
      border-left: 3px solid ${(props) => props.theme.colors.text.danger};
    }

    &.new {
      color: ${(props) => props.theme.colors.text.green};
      border-left: 3px solid ${(props) => props.theme.colors.text.green};
    }
  }

  .diff-sections {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .diff-row {
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.base};
    overflow: hidden;
  }

  .diff-row-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: ${(props) => props.theme.sidebar.bg};
    cursor: pointer;
    user-select: none;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};

    &:hover {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }
  }

  .collapse-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .diff-row-title {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }

  .diff-row-content {
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    background: ${(props) => props.theme.background.base};
  }

  .diff-row-pane {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    &.old {
      border-left: 2px solid ${(props) => props.theme.colors.text.danger}20;
      padding-left: 0.5rem;
    }

    &.new {
      border-left: 2px solid ${(props) => props.theme.colors.text.green}20;
      padding-left: 0.5rem;
    }
  }

  .empty-placeholder {
    flex: 1;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${(props) => props.theme.sidebar.bg};
    border: 1px dashed ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.xs};

    &::after {
      content: 'No content';
    }
  }

  .diff-section {
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};
    overflow: hidden;
  }

  .diff-section-header {
    padding: 0.375rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    background: ${(props) => props.theme.sidebar.bg};
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .diff-section-content {
    padding: 0.5rem;
  }

  .url-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.5rem;

    .method {
      font-weight: 600;
      font-size: ${(props) => props.theme.font.size.xs};
      text-transform: uppercase;
      padding: 0.125rem 0.375rem;
      border-radius: ${(props) => props.theme.border.radius.sm};
      background: ${(props) => props.theme.brand}15;
      color: ${(props) => props.theme.brand};
    }

    .url {
      flex: 1;
      font-family: 'Fira Code', monospace;
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.text};
      word-break: break-all;

      &.changed {
        background: color-mix(in srgb, ${(props) => props.theme.colors.text.warning} 20%, transparent);
        padding: 0.125rem 0.25rem;
        border-radius: ${(props) => props.theme.border.radius.sm};
      }
    }

    .method.changed {
      background: color-mix(in srgb, ${(props) => props.theme.colors.text.warning} 30%, transparent);
      color: ${(props) => props.theme.colors.text.warning};
    }
  }

  .diff-inline {
    padding: 0.125rem 0.25rem;
    border-radius: 2px;

    &.added {
      background: color-mix(in srgb, ${(props) => props.theme.colors.text.green} 25%, transparent);
      color: ${(props) => props.theme.colors.text.green};
    }

    &.deleted {
      background: color-mix(in srgb, ${(props) => props.theme.colors.text.danger} 25%, transparent);
      color: ${(props) => props.theme.colors.text.danger};
      text-decoration: line-through;
    }

    &.modified {
      background: color-mix(in srgb, ${(props) => props.theme.colors.text.warning} 25%, transparent);
      color: ${(props) => props.theme.colors.text.warning};
    }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 0.5rem;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .not-bru-file {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 0.5rem;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.sm};
    text-align: center;
  }
`;

export default StyledWrapper;
