import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  max-width: 960px;
  font-size: 0.875rem;
  color: ${(p) => p.theme.text};

  /* ─────── header ─────── */

  .panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .panel-head-text { flex: 1; min-width: 0; }

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

    code {
      background-color: ${(p) => p.theme.input.bg};
      border: 1px solid ${(p) => p.theme.input.border};
      border-radius: 3px;
      padding: 0 4px;
      font-size: 0.75rem;
    }
  }

  .panel-head-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .panel-summary {
    font-size: 0.74rem;
    opacity: 0.65;
    margin-right: 0.25rem;
  }

  .add-plugin-btn,
  .save-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.7rem;
    background: ${(p) => p.theme.input.bg};
    color: ${(p) => p.theme.text};
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;

    &:hover {
      border-color: ${(p) => p.theme.input.focusBorder};
    }
  }

  .save-btn {
    background: ${(p) => p.theme.input.focusBorder};
    color: white;
    border-color: ${(p) => p.theme.input.focusBorder};

    &:hover { opacity: 0.92; }
  }

  /* ─────── catalog panel (rendered inside Modal) ─────── */

  .catalog-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 0;
  }

  .catalog-tabs {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .catalog-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 0.3rem 0.6rem;
    font-size: 0.78rem;
    color: ${(p) => p.theme.text};
    cursor: pointer;

    &:hover {
      background: ${(p) => p.theme.input.bg};
    }

    &.active {
      background: ${(p) => p.theme.input.bg};
      border-color: ${(p) => p.theme.input.border};
      font-weight: 500;
    }
  }

  .catalog-body {
    max-height: 60vh;
    overflow-y: auto;
    margin: 0 -0.25rem;
    padding: 0 0.25rem;
  }

  .catalog-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
    padding: 0.25rem 0;
  }

  .catalog-card {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.7rem;
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 5px;
    background: ${(p) => p.theme.input.bg};

    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .card-name {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-weight: 600;
      font-size: 0.84rem;
    }

    .card-desc {
      margin: 0;
      font-size: 0.76rem;
      opacity: 0.72;
    }
  }

  .catalog-card-state {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    min-height: 0.85rem;
  }

  .card-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.15rem;
  }

  .card-actions-buttons {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 26px;
  }

  .catalog-action {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.6rem;
    font-size: 0.76rem;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;

    &:disabled { opacity: 0.55; cursor: default; }

    &.primary {
      background: ${(p) => p.theme.input.focusBorder};
      color: white;
      &:hover:not(:disabled) { opacity: 0.92; }
    }

    &.outline {
      background: transparent;
      color: ${(p) => p.theme.text};
      border-color: ${(p) => p.theme.input.border};
      &:hover:not(:disabled) { border-color: ${(p) => p.theme.input.focusBorder}; }
    }
  }

  .card-docs {
    background: transparent;
    border: none;
    color: ${(p) => p.theme.text};
    opacity: 0.6;
    font-size: 0.72rem;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    cursor: pointer;
    padding: 3px 5px;
    border-radius: 3px;

    &:hover {
      opacity: 1;
      background: ${(p) => p.theme.bg};
    }
  }

  .templates-split {
    display: grid;
    grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
    gap: 0.75rem;
    align-items: stretch;
  }

  .templates-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    border-right: 1px solid ${(p) => p.theme.input.border};
    padding-right: 0.75rem;
  }

  .templates-list-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    text-align: left;
    gap: 0.15rem;
    padding: 0.5rem 0.6rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 5px;
    cursor: pointer;
    color: ${(p) => p.theme.text};
    transition: background-color 0.1s ease, border-color 0.1s ease;

    .template-name {
      font-size: 0.83rem;
      font-weight: 500;
      margin: 0;
    }

    .template-desc {
      font-size: 0.72rem;
      opacity: 0.6;
      line-height: 1.35;
    }

    &:hover {
      background: ${(p) => p.theme.input.bg};
    }

    &.active {
      background: ${(p) => p.theme.input.bg};
      border-color: ${(p) => p.theme.input.focusBorder};

      .template-name { font-weight: 600; }
      .template-desc { opacity: 0.78; }
    }
  }

  .template-detail {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    min-width: 0;
  }

  .template-detail-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .template-detail-name {
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 0.15rem;
  }

  .template-detail-desc {
    font-size: 0.76rem;
    opacity: 0.72;
    max-width: 540px;
  }

  .template-meta,
  .template-usage {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
    font-size: 0.74rem;
  }

  .template-meta-label {
    text-transform: uppercase;
    font-size: 0.64rem;
    letter-spacing: 0.05em;
    opacity: 0.55;
    font-weight: 600;
  }

  .template-snippet-label {
    margin-top: 0.15rem;
  }

  .template-usage-code {
    background: ${(p) => p.theme.bg};
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 3px;
    padding: 1px 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.72rem;
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .template-snippet {
    margin: 0;
    padding: 0.65rem 0.8rem;
    background: ${(p) => p.theme.bg};
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.72rem;
    line-height: 1.5;
    color: ${(p) => p.theme.text};
    opacity: 0.88;
    width: 100%;
    max-width: 100%;
    max-height: 280px;
    overflow: auto;
    white-space: pre;
  }

  /* ─────── plugin list ─────── */

  .plugin-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    overflow-y: auto;
    min-height: 0;
  }

  .plugin-card {
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 6px;
    background: ${(p) => p.theme.bg};
    transition: opacity 0.12s ease, border-color 0.12s ease;

    &.off { opacity: 0.6; }
    &.dragging { opacity: 0.35; }
    &.drop-target { border-color: ${(p) => p.theme.input.focusBorder}; }
  }

  .card-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.6rem 0.45rem 0.35rem;
  }

  .card-grip {
    cursor: grab;
    opacity: 0.45;
    display: inline-flex;
    align-items: center;
    padding: 0.2rem;
    border-radius: 3px;

    &:hover { opacity: 0.85; background: ${(p) => p.theme.input.bg}; }
    &:active { cursor: grabbing; }
  }

  .card-collapse {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    padding: 0.2rem;
    cursor: pointer;
    color: ${(p) => p.theme.text};
    opacity: 0.65;
    display: inline-flex;

    &:hover {
      opacity: 1;
      background: ${(p) => p.theme.input.bg};
    }
  }

  .plugin-card .card-name {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 0.25rem 0.45rem;
    color: ${(p) => p.theme.text};
    outline: none;
    font-size: 0.88rem;
    font-weight: 500;
    font-family: inherit;

    &:hover { background: ${(p) => p.theme.input.bg}; }
    &:focus {
      background: ${(p) => p.theme.input.bg};
      border-color: ${(p) => p.theme.input.focusBorder};
    }
  }

  .card-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.22rem;
    padding: 1px 7px 1px 5px;
    font-size: 0.7rem;
    line-height: 1.4;
    border-radius: 999px;
    border: 1px solid transparent;
    flex-shrink: 0;

    &.ok {
      color: #16a34a;
      background: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.25);
    }
    &.warn {
      color: #b45309;
      background: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.3);
    }
    &.err {
      color: #dc2626;
      background: rgba(220, 38, 38, 0.08);
      border-color: rgba(220, 38, 38, 0.25);
    }
    &.muted {
      color: ${(p) => p.theme.text};
      opacity: 0.55;
      background: ${(p) => p.theme.input.bg};
      border-color: ${(p) => p.theme.input.border};
    }
    &.idle {
      color: ${(p) => p.theme.text};
      opacity: 0.7;
      background: ${(p) => p.theme.input.bg};
      border-color: ${(p) => p.theme.input.border};
    }
    &.installing {
      color: ${(p) => p.theme.text};
      opacity: 0.8;
      background: ${(p) => p.theme.input.bg};
      border-color: ${(p) => p.theme.input.border};
    }

    .spin { animation: bruno-plugins-spin 0.9s linear infinite; }
  }

  /* mini-toggle (replaces the broken ToggleSwitch in the card head) */
  .mini-toggle {
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
  }

  .mini-toggle-track {
    position: relative;
    display: inline-block;
    width: 28px;
    height: 14px;
    border-radius: 7px;
    background: ${(p) => p.theme.input.border};
    transition: background-color 0.15s ease;
  }

  .mini-toggle-thumb {
    position: absolute;
    top: 1.5px;
    left: 1.5px;
    width: 11px;
    height: 11px;
    background: #fafafa;
    border-radius: 50%;
    transition: transform 0.15s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  }

  .mini-toggle.on .mini-toggle-track { background: #22c55e; }
  .mini-toggle.on .mini-toggle-thumb { transform: translateX(14px); }

  .card-icon-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 0.25rem 0.35rem;
    cursor: pointer;
    color: ${(p) => p.theme.text};
    opacity: 0.55;
    display: inline-flex;
    align-items: center;

    &:hover {
      opacity: 1;
      background: ${(p) => p.theme.input.bg};
      border-color: ${(p) => p.theme.input.border};
    }

    &.danger:hover {
      color: #dc2626;
      border-color: rgba(220, 38, 38, 0.3);
    }
  }

  .card-adds {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
    padding: 0 0.85rem 0.5rem 1.8rem;
    font-size: 0.74rem;
  }

  .adds-label { opacity: 0.6; }

  .adds-chip {
    background: ${(p) => p.theme.input.bg};
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 0.72rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .card-warn-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin: 0 0.6rem 0.5rem 1.75rem;
    padding: 0.35rem 0.55rem;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 4px;
    font-size: 0.74rem;
    color: #b45309;

    code {
      background: rgba(245, 158, 11, 0.15);
      border-radius: 3px;
      padding: 0 4px;
      font-size: 0.72rem;
    }
  }

  .card-link-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: transparent;
    border: 1px solid ${(p) => p.theme.input.border};
    border-radius: 4px;
    padding: 0.25rem 0.55rem;
    cursor: pointer;
    color: ${(p) => p.theme.text};
    font-size: 0.74rem;

    &:disabled { opacity: 0.6; cursor: default; }
    &:hover:not(:disabled) { border-color: ${(p) => p.theme.input.focusBorder}; }

    &.primary {
      background: ${(p) => p.theme.input.focusBorder};
      color: white;
      border-color: ${(p) => p.theme.input.focusBorder};
      &:hover:not(:disabled) { opacity: 0.92; }
    }
  }

  .card-body {
    border-top: 1px solid ${(p) => p.theme.input.border};
  }

  .card-editor-wrap {
    position: relative;
    height: 220px;
    overflow: hidden;
  }

  .card-editor-wrap .CodeMirror,
  .card-editor-wrap .editor-container {
    height: 100% !important;
  }

  .card-foot {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.35rem 0.7rem;
    border-top: 1px solid ${(p) => p.theme.input.border};
    background: ${(p) => p.theme.input.bg};
    font-size: 0.74rem;

    .foot-status {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;

      &.ok { color: #16a34a; }
      &.err { color: #dc2626; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.72rem; }
      &.hint { opacity: 0.6; }
    }
  }

  /* ─────── empty state ─────── */

  .plugins-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
  }

  .empty-hero { text-align: center; max-width: 560px; }

  .empty-title { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem 0; }

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

  .empty-ctas { display: flex; gap: 0.75rem; justify-content: center; }

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

  @keyframes bruno-plugins-spin {
    to { transform: rotate(360deg); }
  }
`;

export default StyledWrapper;
