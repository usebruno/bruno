import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  max-width: 1200px;
  font-size: 0.875rem;
  color: ${(p) => p.theme.text};

  /* ───────────────────────── header ───────────────────────── */

  .panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .panel-title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.15rem 0;
  }

  .panel-blurb {
    margin: 0;
    font-size: 0.8rem;
    opacity: 0.75;
    max-width: 640px;
  }

  .panel-blurb code {
    background-color: ${(p) => p.theme.input.bg};
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 3px;
    padding: 0 4px;
    font-size: 0.75rem;
  }

  .panel-head-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .meta-label {
    font-size: 0.75rem;
    opacity: 0.6;
  }

  /* ───────────────────────── body ───────────────────────── */

  .panel-body {
    flex: 1;
    display: flex;
    min-height: 0;
    gap: 0;
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 6px;
    overflow: hidden;
    background: ${(p) => p.theme.bg};
  }

  /* ───────────────────────── sidebar ───────────────────────── */

  .plugins-sidebar {
    width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid ${(p) => p.theme.input.border};
    background: ${(p) => p.theme.bg};
  }

  .sidebar-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.75rem 0.85rem;
    border-bottom: 1px solid ${(p) => p.theme.input.border};
  }

  .sidebar-title {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.6;
  }

  .sidebar-count {
    font-size: 0.7rem;
    background: ${(p) => p.theme.input.bg};
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 10px;
    padding: 0 6px;
    line-height: 1.4;
    opacity: 0.8;
  }

  .plugins-list {
    flex: 1;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 0.25rem 0;
  }

  .plugin-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    cursor: pointer;
    border-left: 2px solid transparent;
    transition: background-color 0.1s ease;

    &:hover {
      background: ${(p) => p.theme.input.bg};
    }

    &.active {
      background: ${(p) => p.theme.input.bg};
      border-left-color: ${(p) => p.theme.input.focusBorder};
    }

    &.dragging { opacity: 0.4; }
    &.drop-target { background: ${(p) => p.theme.input.bg}; }
  }

  .plugin-grip {
    cursor: grab;
    opacity: 0.4;
    display: flex;
    align-items: center;

    &:hover { opacity: 0.8; }
    &:active { cursor: grabbing; }
  }

  .plugin-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    &.dot-green { background: #22c55e; }
    &.dot-red { background: #ef4444; }
    &.dot-gray { background: ${(p) => p.theme.input.border}; }
    &.dot-muted { background: ${(p) => p.theme.input.border}; opacity: 0.5; }
  }

  .plugin-row-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }

  .plugin-row-name {
    font-size: 0.8rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .plugin-row-sublabel {
    font-size: 0.7rem;
    opacity: 0.55;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar-foot {
    padding: 0.6rem 0.7rem;
    border-top: 1px solid ${(p) => p.theme.input.border};
  }

  /* ───────────────────────── add menu ───────────────────────── */

  .add-menu { position: relative; }

  .add-menu-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.45rem 0.6rem;
    background: ${(p) => p.theme.input.bg};
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 4px;
    color: ${(p) => p.theme.text};
    font-size: 0.8rem;
    cursor: pointer;

    &:hover {
      border-color: ${(p) => p.theme.input.focusBorder};
    }
  }

  .add-menu-pop {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    right: 0;
    background: ${(p) => p.theme.bg};
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    padding: 0.25rem;
    z-index: 30;

    button {
      width: 100%;
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.5rem 0.6rem;
      background: transparent;
      border: none;
      text-align: left;
      cursor: pointer;
      color: ${(p) => p.theme.text};
      border-radius: 4px;
      transition: background-color 0.08s ease;

      &:hover { background: ${(p) => p.theme.input.bg}; }

      > span:last-child {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
      }
    }

    .menu-item-title { font-size: 0.8rem; font-weight: 500; }
    .menu-item-sub { font-size: 0.7rem; opacity: 0.6; }
  }

  /* ───────────────────────── detail pane ───────────────────────── */

  .plugin-detail {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: ${(p) => p.theme.bg};
  }

  .detail-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 0.9rem;
    border-bottom: 1px solid ${(p) => p.theme.input.border};
  }

  .detail-name {
    flex: 1;
    font-size: 0.95rem;
    font-weight: 500;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    color: ${(p) => p.theme.text};
    outline: none;

    &:hover {
      background: ${(p) => p.theme.input.bg};
    }

    &:focus {
      background: ${(p) => p.theme.input.bg};
      border-color: ${(p) => p.theme.input.focusBorder};
    }
  }

  .detail-head-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .detail-delete {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 0.3rem 0.4rem;
    cursor: pointer;
    color: ${(p) => p.theme.text};
    opacity: 0.55;

    &:hover {
      opacity: 1;
      background: ${(p) => p.theme.input.bg};
      border-color: ${(p) => p.theme.input.border};
    }
  }

  .detail-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.9rem;
    border-bottom: 1px solid ${(p) => p.theme.input.border};
    background: ${(p) => p.theme.input.bg};
  }

  .meta-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 0.75rem;
    color: ${(p) => p.theme.text};
    user-select: none;

    &:focus-visible {
      outline: 2px solid ${(p) => p.theme.input.focusBorder};
      outline-offset: 2px;
      border-radius: 4px;
    }
  }

  .meta-toggle-track {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 16px;
    border-radius: 8px;
    background: ${(p) => p.theme.input.border};
    transition: background-color 0.15s ease;
    flex-shrink: 0;
  }

  .meta-toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    background: #fafafa;
    border-radius: 50%;
    transition: transform 0.15s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .meta-toggle-btn.on .meta-toggle-track {
    background: #22c55e;
  }

  .meta-toggle-btn.on .meta-toggle-thumb {
    transform: translateX(16px);
  }

  .meta-toggle-label {
    opacity: 0.85;
  }

  .detail-editor-wrap {
    position: relative;
    flex: 1;
    min-height: 220px;
    overflow: hidden;
  }

  .detail-editor-wrap .CodeMirror,
  .detail-editor-wrap .editor-container {
    height: 100% !important;
  }

  .detail-foot {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.9rem;
    border-top: 1px solid ${(p) => p.theme.input.border};
    font-size: 0.75rem;
    background: ${(p) => p.theme.input.bg};

    kbd {
      background: ${(p) => p.theme.bg};
      border: 1px solid ${(p) => p.theme.input.border};
      border-radius: 3px;
      padding: 0 4px;
      font-size: 0.7rem;
      font-family: inherit;
    }

    &.ok { color: #16a34a; }
    &.err { color: #dc2626; }
    &.idle { opacity: 0.7; }

    .err-msg {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.72rem;
    }
  }

  /* ───────────────────────── empty state ───────────────────────── */

  .plugins-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 2rem 1rem;
  }

  .empty-hero {
    text-align: center;
    max-width: 560px;
  }

  .empty-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  .empty-blurb {
    margin: 0 0 1.25rem 0;
    opacity: 0.75;

    code {
      background: ${(p) => p.theme.input.bg};
      border: 1px solid ${(p) => p.theme.input.border};
      border-radius: 3px;
      padding: 0 4px;
      font-size: 0.78rem;
    }
  }

  .empty-ctas {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }

  .empty-divider {
    width: 100%;
    max-width: 720px;
    text-align: center;
    margin: 2rem 0 1rem;
    position: relative;
    font-size: 0.75rem;
    opacity: 0.5;
  }

  .empty-divider::before,
  .empty-divider::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 30%;
    height: 1px;
    background: ${(p) => p.theme.input.border};
  }

  .empty-divider::before { left: 0; }
  .empty-divider::after { right: 0; }

  .empty-examples {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    width: 100%;
    max-width: 800px;
  }

  .example-card {
    background: ${(p) => p.theme.input.bg};
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 5px;
    padding: 0.6rem;
    overflow: hidden;
  }

  .example-title {
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.35rem;
    opacity: 0.85;
  }

  .example-body {
    margin: 0;
    font-size: 0.7rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    opacity: 0.7;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* ───────────────────────── modals ───────────────────────── */

  .plugins-catalog {
    min-width: 640px;
  }

  .catalog-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .catalog-card {
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 6px;
    padding: 0.75rem;
    background: ${(p) => p.theme.input.bg};
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .card-name {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .card-desc {
    margin: 0;
    font-size: 0.78rem;
    opacity: 0.75;
    flex: 1;
  }

  .card-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.25rem;
  }

  .card-docs {
    background: transparent;
    border: none;
    color: ${(p) => p.theme.text};
    opacity: 0.65;
    font-size: 0.74rem;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 3px;

    &:hover {
      opacity: 1;
      background: ${(p) => p.theme.bg};
    }
  }

  .catalog-footnote {
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid ${(p) => p.theme.input.border};
    font-size: 0.74rem;
    opacity: 0.7;
  }

  .plugins-templates {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 0.75rem;
    min-width: 720px;
    min-height: 360px;
  }

  .templates-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .template-item {
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 5px;
    padding: 0.55rem 0.65rem;
    cursor: pointer;
    color: ${(p) => p.theme.text};

    &:hover {
      background: ${(p) => p.theme.input.bg};
    }

    &.active {
      background: ${(p) => p.theme.input.bg};
      border-color: ${(p) => p.theme.input.focusBorder};
    }
  }

  .template-name {
    font-size: 0.82rem;
    font-weight: 500;
    margin-bottom: 0.15rem;
  }

  .template-desc {
    font-size: 0.7rem;
    opacity: 0.65;
  }

  .templates-preview {
    display: flex;
    flex-direction: column;
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 6px;
    overflow: hidden;
    background: ${(p) => p.theme.input.bg};
  }

  .template-snippet {
    flex: 1;
    margin: 0;
    padding: 0.75rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.75rem;
    overflow: auto;
    white-space: pre;
  }

  .template-actions {
    display: flex;
    justify-content: flex-end;
    padding: 0.5rem 0.75rem;
    border-top: 1px solid ${(p) => p.theme.input.border};
    background: ${(p) => p.theme.bg};
  }
`;

export default StyledWrapper;
