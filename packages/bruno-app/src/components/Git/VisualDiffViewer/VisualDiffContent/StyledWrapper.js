import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;

  .visual-diff-content {
    flex: 1;
    overflow: auto;
  }

  .diff-header-row {
    display: flex;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.base};
    margin-bottom: 1rem;
  }

  .diff-header-pane {
     flex: 1;
      padding: 0.5rem 0.75rem;
      font-size: ${(props) => props.theme.font.size.xs};
      font-weight: 600;
      color: ${(props) => props.theme.colors.text.muted};
      text-transform: uppercase;

      &.old {
        border-right: 1px solid ${(props) => props.theme.border.border1};
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
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
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
  }

  .empty-placeholder::after {
    content: 'No content';
  }

  .diff-section {
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};
    overflow: hidden;

    &.added {
      border-color: ${(props) => props.theme.colors.text.green};
    }

    &.deleted {
      border-color: ${(props) => props.theme.colors.text.danger};
    }
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



  .diff-table {
    width: 100%;
    border-collapse: collapse;
    font-size: ${(props) => props.theme.font.size.xs};

    th, td {
      padding: 0.375rem 0.5rem;
      text-align: left;
      border-bottom: 1px solid ${(props) => props.theme.border.border1};
    }

    th {
      font-weight: 500;
      color: ${(props) => props.theme.colors.text.muted};
      background: ${(props) => props.theme.sidebar.bg};
    }

    tr.added {
      background: color-mix(in srgb, ${(props) => props.theme.colors.text.green} 10%, transparent);
    }

    tr.deleted {
      background: color-mix(in srgb, ${(props) => props.theme.colors.text.danger} 10%, transparent);
    }

    tr.modified {
      background: color-mix(in srgb, ${(props) => props.theme.colors.text.warning} 10%, transparent);
    }

    .checkbox-cell {
      width: 24px;
      text-align: center;

      input[type='checkbox'] {
        cursor: default;
        width: 12px;
        height: 12px;
        accent-color: ${(props) => props.theme.colors.accent};
        vertical-align: middle;
        margin: 0;
      }
    }

    .key-cell {
      font-family: 'Fira Code', monospace;
      color: ${(props) => props.theme.text};
    }

    .value-cell {
      font-family: 'Fira Code', monospace;
      color: ${(props) => props.theme.colors.text.muted};
      word-break: break-all;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 0.875rem;
      height: 0.875rem;
      border-radius: 2px;
      font-size: 8px;
      font-weight: 600;

      &.added {
        background: color-mix(in srgb, ${(props) => props.theme.colors.text.green} 13%, transparent);
        color: ${(props) => props.theme.colors.text.green};
      }

      &.deleted {
        background: color-mix(in srgb, ${(props) => props.theme.colors.text.danger} 13%, transparent);
        color: ${(props) => props.theme.colors.text.danger};
      }

      &.modified {
        background: color-mix(in srgb, ${(props) => props.theme.colors.text.warning} 13%, transparent);
        color: ${(props) => props.theme.colors.text.warning};
      }
    }
  }

  .code-diff-content {
    max-height: 250px;
    overflow: auto;
    font-family: 'Fira Code', monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.5;

    .diff-line {
      padding: 0 0.5rem;
      white-space: pre-wrap;
      word-break: break-word;

      &.unchanged {
        color: ${(props) => props.theme.text};
      }

      &.added {
        background: color-mix(in srgb, ${(props) => props.theme.colors.text.green} 15%, transparent);
        color: ${(props) => props.theme.colors.text.green};
      }

      &.deleted {
        background: color-mix(in srgb, ${(props) => props.theme.colors.text.danger} 15%, transparent);
        color: ${(props) => props.theme.colors.text.danger};
        text-decoration: line-through;
      }
    }
  }

  .example-content {
    padding: 0.5rem;
  }

  .example-block {
    margin-bottom: 0.5rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .example-block-header {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.25rem 0.5rem;
    background: ${(props) => props.theme.sidebar.bg};
    border-radius: ${(props) => props.theme.border.radius.sm};
    margin-bottom: 0.375rem;
  }

  .example-subsection {
    margin-bottom: 0.375rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .example-subsection-title {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
    padding: 0.25rem 0.5rem;
    margin-bottom: 0.25rem;
  }

  .example-description {
    font-weight: 400;
    color: ${(props) => props.theme.colors.text.muted};
    font-style: italic;
  }

  .status-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    font-family: 'Fira Code', monospace;
    font-size: ${(props) => props.theme.font.size.xs};

    .status-code {
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      border-radius: ${(props) => props.theme.border.radius.sm};
      background: ${(props) => props.theme.sidebar.bg};

      &.changed {
        background: color-mix(in srgb, ${(props) => props.theme.colors.text.warning} 20%, transparent);
        color: ${(props) => props.theme.colors.text.warning};
      }
    }

    .status-text {
      color: ${(props) => props.theme.colors.text.muted};

      &.changed {
        color: ${(props) => props.theme.colors.text.warning};
      }
    }
  }

  .example-subsection .diff-table {
    margin: 0;
  }

  .example-subsection .code-diff-content {
    max-height: 150px;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .tag-badge {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    font-size: ${(props) => props.theme.font.size.xs};
    font-family: 'Fira Code', monospace;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: ${(props) => props.theme.sidebar.bg};
    border: 1px solid ${(props) => props.theme.border.border1};

    &.added {
      background: color-mix(in srgb, ${(props) => props.theme.colors.text.green} 15%, transparent);
      border-color: ${(props) => props.theme.colors.text.green};
      color: ${(props) => props.theme.colors.text.green};
    }

    &.deleted {
      background: color-mix(in srgb, ${(props) => props.theme.colors.text.danger} 15%, transparent);
      border-color: ${(props) => props.theme.colors.text.danger};
      color: ${(props) => props.theme.colors.text.danger};
      text-decoration: line-through;
    }

    &.modified {
      background: color-mix(in srgb, ${(props) => props.theme.colors.text.warning} 15%, transparent);
      border-color: ${(props) => props.theme.colors.text.warning};
      color: ${(props) => props.theme.colors.text.warning};
    }
  }
`;

export default StyledWrapper;
