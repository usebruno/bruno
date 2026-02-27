import styled from 'styled-components';
import { rgba, darken } from 'polished';

const StyledWrapper = styled.div`

  .setup-header {
    margin-bottom: 1.5rem;
  }

  .setup-title {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 600;
    color: ${(props) => props.theme.text};
    margin: 0 0 0.375rem 0;
  }

  .setup-description {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    line-height: 1.5;
    margin: 0;
  }

  .setup-form {
    /* background: ${(props) => props.theme.background.surface0}; */
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    padding: 1rem;
    margin-bottom: 1.25rem;

    .url-label {
      display: block;
      font-size: ${(props) => props.theme.font.size.sm};
      font-weight: 500;
      color: ${(props) => props.theme.text};
      margin-bottom: 0.5rem;
    }

    .url-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .url-input {
      flex: 1;
      padding: 0.25rem 0.75rem;
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.input.bg};
      border: 1px solid ${(props) => props.theme.input.border};
      border-radius: ${(props) => props.theme.border.radius.md};
      outline: none;

      &:focus {
        border-color: ${(props) => props.theme.input.focusBorder};
      }

      &::placeholder {
        color: ${(props) => props.theme.colors.text.muted};
      }
    }
  }

  .setup-hint {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin: 0.5rem 0 0 0;
  }

  .setup-features {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .setup-feature {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};

    svg {
      color: ${(props) => props.theme.colors.text.green};
      flex-shrink: 0;
    }
  }

  /* Tab Content */
  .sync-tab-content {
    margin-top: 1rem;
  }

  .url-label {
    display: block;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 0.375rem;
  }

  .url-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .url-input {
    flex: 1;
    padding: 0.375rem 0.75rem;
    font-size: ${(props) => props.theme.font.size.sm};
    font-family: monospace;
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.md};
    outline: none;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &::placeholder {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  /* Spec Info Card — borderless header */
  .spec-info-card {
    margin-bottom: 5px;

    .spec-info-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 5px;
    }

    .spec-title-section {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .spec-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .spec-title {
      font-weight: 600;
      font-size: 13px;
      color: ${(props) => props.theme.text};
    }

    .spec-version {
      font-size: 10px;
      font-family: monospace;
      color: ${(props) => props.theme.colors.text.muted};
      background: ${(props) => props.theme.background.surface1};
      border: 1px solid ${(props) => props.theme.border.border1};
      padding: 2px 7px;
      border-radius: ${(props) => props.theme.border.radius.sm};
    }

    .spec-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .spec-url-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;

      .spec-url-label {
        font-size: 11px;
        color: ${(props) => props.theme.colors.text.muted};
        flex-shrink: 0;
      }

      .spec-url-value {
        font-family: monospace;
        font-size: 11px;
        color: ${(props) => props.theme.colors.text.subtext0};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
          color: ${(props) => props.theme.status.info.text};
        }
      }

      .spec-file-reveal {
        background: none;
        border: none;
        padding: 0;
        text-align: left;
        cursor: pointer;

        &:hover {
          text-decoration: underline;
          color: ${(props) => props.theme.status.info.text};
        }
      }

    }

    .copy-btn {
      flex-shrink: 0;
      padding: 0 4px;
      background: none;
      border: none;
      color: ${(props) => props.theme.colors.text.muted};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: ${(props) => props.theme.text};
      }
    }

    .spec-info-meta {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
      font-size: 11px;
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  /* Update Banner */
  .spec-update-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    margin-top: 12px;
    border-radius: 8px;
    background: ${(props) => rgba(props.theme.dropdown.selectedColor, 0.08)};
    overflow: hidden;

    &.danger {
      border-color: ${(props) => props.theme.status.danger.border};
      background: ${(props) => props.theme.status.danger.background};
    }

    &.info {
      border-color: ${(props) => props.theme.status.info.border};
      background: ${(props) => props.theme.status.info.background};
    }

    &.success {
      background: ${(props) => props.theme.status.success.background};

      .status-dot::before {
        animation: none;
      }
    }

    &.muted {
      background: ${(props) => props.theme.background.surface0};
    }

    .banner-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .status-dot {
      position: relative;
      width: 12px;
      height: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &::before {
        content: '';
        position: absolute;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        opacity: 0.35;
        animation: radiate 1.6s ease-out infinite;
      }

      &::after {
        content: '';
        position: relative;
        width: 7px;
        height: 7px;
        border-radius: 50%;
      }

      &.success {
        &::before, &::after { background: ${(props) => props.theme.colors.text.green}; }
      }
      &.info {
        &::before, &::after { background: ${(props) => props.theme.status.info.text}; }
      }
      &.warning {
        &::before, &::after { background: ${(props) => props.theme.colors.text.warning}; }
      }
      &.danger {
        &::before, &::after { background: ${(props) => props.theme.colors.text.danger}; }
      }
      &.muted {
        &::before, &::after { background: ${(props) => props.theme.colors.text.muted}; }
      }
    }

    .status-check-icon {
      flex-shrink: 0;
      color: ${(props) => props.theme.colors.text.green};
    }

    .banner-title {
      font-size: 12px;
      font-weight: 500;
      color: ${(props) => props.theme.text};

      .version-code {
        font-family: monospace;
        font-size: 11px;
        padding: 1px 5px;
        border-radius: 3px;
        background: ${(props) => props.theme.background.surface1};
        border: 1px solid ${(props) => props.theme.border.border1};
      }

      .checked-text {
        font-weight: 400;
        font-size: 11px;
        font-style: italic;
        color: ${(props) => props.theme.colors.text.muted};
      }
    }

    .banner-details {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;

      .detail-tag {
        font-size: 11px;
        font-weight: 500;
        padding: 1px 6px;
        border-radius: 9999px;
        white-space: nowrap;

        &.added {
          color: ${(props) => props.theme.colors.text.green};
          background: ${(props) => props.theme.status.success.background};
        }

        &.modified {
          color: ${(props) => props.theme.status.info.text};
          background: ${(props) => props.theme.status.info.background};
        }

        &.removed {
          color: ${(props) => props.theme.colors.text.danger};
          background: ${(props) => props.theme.status.danger.background};
        }
      }
    }

    .banner-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .banner-close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      background: none;
      border: none;
      color: ${(props) => props.theme.colors.text.muted};
      cursor: pointer;
      border-radius: ${(props) => props.theme.border.radius.sm};
      opacity: 0.6;

      &:hover {
        opacity: 1;
        color: ${(props) => props.theme.colors.text.danger};
      }
    }
  }

  @keyframes radiate {
    0%   { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(2.8); opacity: 0; }
  }

  /* Summary Cards */

  .sync-summary-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .sync-summary-title {
      margin-bottom: 0;
    }

    .last-synced-pill {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 2px 8px;
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.colors.text.muted};
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: ${(props) => props.theme.border.radius.xl};

      strong {
        color: ${(props) => props.theme.text};
        font-weight: 600;
      }

      .last-synced-sep {
        opacity: 0.6;
      }
    }
  }

  .sync-summary-title {
    font-size: 13px;
    font-weight: 600;
    color: ${(props) => props.theme.text};
    margin-bottom: 10px;
  }

  .sync-summary-subtitle {
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
    font-weight: 400;
    margin-top: 2px;
  }

  .sync-summary-cards {
    display: flex;
    gap: 10px;
  }

  .discard-all-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.25rem;
    margin-top: -30px;
  }

  .summary-card {
    width: 180px;
    flex-shrink: 0;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: 8px;
    padding: 14px 16px;
    background: ${(props) => props.theme.background.default};
    position: relative;
  }

  .summary-count-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 8px;
  }

  .summary-count {
    font-size: 28px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;

    &.green  { color: ${(props) => props.theme.colors.text.green}; }
    &.amber  { color: ${(props) => props.theme.colors.text.warning}; }
    &.blue   { color: ${(props) => props.theme.status.info.text}; }
    &.red    { color: ${(props) => props.theme.colors.text.danger || '#c0392b'}; }
    &.purple { color: #7c3aed; }
    &.muted  { color: ${(props) => props.theme.colors.text.muted}; }
  }

  .summary-count-unit {
    font-size: 10px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .summary-label {
    font-size: 12px;
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }

  .card-info-icon {
    position: absolute;
    top: 8px;
    right: 8px;

    svg {
      margin: 0;
      width: 12px;
      height: 12px;
      opacity: 0.3;
    }

    &:hover svg {
      opacity: 0.6;
    }
  }

  /* Connection Settings Modal */
  .settings-modal {

    .settings-field {
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .settings-label {
      font-size: 11px;
      font-weight: 600;
      color: ${(props) => props.theme.colors.text.subtext0};
      display: block;
      margin-bottom: 5px;
    }

    .settings-input {
      width: 100%;
      padding: 7px 10px;
      font-size: 12px;
      font-family: monospace;
      color: ${(props) => props.theme.text};
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: 5px;
      background: ${(props) => props.theme.input.bg};
      outline: none;
      box-sizing: border-box;
      text-align: left;

      &:focus {
        border-color: ${(props) => props.theme.input.focusBorder};
      }

      &.file-pick-btn {
        cursor: pointer;
        color: ${(props) => props.theme.colors.text.muted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .settings-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .toggle-info {
      flex: 1;
      min-width: 0;
    }

    .toggle-description {
      font-size: 11px;
      color: ${(props) => props.theme.colors.text.muted};
      margin-top: 2px;
    }

    .toggle-switch {
      width: 34px;
      height: 20px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      position: relative;
      transition: background 0.2s;
      background: ${(props) => props.theme.colors.text.muted};

      &.active {
        background: ${(props) => props.theme.colors.text.green};
      }

      .toggle-knob {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        position: absolute;
        top: 3px;
        left: 3px;
        transition: left 0.2s;
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
      }

      &.active .toggle-knob {
        left: 17px;
      }
    }

    .interval-buttons {
      display: flex;
      gap: 6px;
      margin-top: 8px;

      button {
        padding: 5px 12px;
        font-size: 12px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: 500;
        border: 1px solid ${(props) => props.theme.border.border1};
        background: ${(props) => props.theme.background.default};
        color: ${(props) => props.theme.colors.text.subtext0};
        transition: all 0.15s;

        &.active {
          border-color: ${(props) => props.theme.button2.color.primary.border};
          background: ${(props) => props.theme.button2.color.primary.bg};
          color: ${(props) => props.theme.button2.color.primary.text};
        }
      }
    }

    .settings-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 14px;
    }

    .disconnect-link {
      font-size: 12px;
      color: ${(props) => props.theme.colors.text.danger};
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;

      &:hover {
        text-decoration: underline;
      }
    }

    .settings-actions {
      display: flex;
      gap: 8px;
    }
  }

  .section-description {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin: 0 0 0.75rem 0;
  }

  /* Sync Alert Banner */
  .sync-alert-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.45rem 0.875rem;
    margin-bottom: 0.75rem;
    background: ${(props) => props.theme.status.warning.background};
    // border: 0.5px solid ${(props) => props.theme.status.warning.border};
    border-radius: ${(props) => props.theme.border.radius.sm};

    .alert-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.status.warning.text};
    }
  }

  /* Sync Success Banner */
  .sync-success-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.45rem 0.875rem;
    margin-bottom: 0.75rem;
    background: ${(props) => props.theme.status.success.background};
    border-radius: ${(props) => props.theme.border.radius.sm};

    .alert-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.status.success.text};
    }
  }

  .sync-action {
    margin-top: 1rem;
  }

  /* State Messages */
  .state-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    gap: 0.5rem;
    color: ${(props) => props.theme.colors.text.muted};

    &.success {
      color: ${(props) => props.theme.colors.text.green};
    }

    .spinning {
      animation: spin 1s linear infinite;
    }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .spec-status-section {
    margin-top: 24px;

    .spec-update-banner {
      margin-top: 0;
    }
  }

  .collection-status-section {
    margin-top: 36px;

    .sync-summary-cards {
      margin-bottom: 0.75rem;
    }

    .change-section {
      margin-top: 0.75rem;

      .section-body.expandable-mode {
        border-radius: 0 0 ${(props) => props.theme.border.radius.sm} ${(props) => props.theme.border.radius.sm};
        max-height: none; /* Override default max-height so all items remain visible */
      }
    }

    /* Local Changes tab: override hover background */
    .endpoint-review-row .review-row-header:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }
  }

  /* Expandable endpoint rows — shared base styles */
  .endpoint-review-row {
    border-bottom: 1px solid ${(props) => props.theme.border.border1};

    &:last-child {
      border-bottom: none;
    }

    .review-row-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;

      &:hover {
        background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      }

      .expand-toggle {
        color: ${(props) => props.theme.colors.text.muted};
      }

      .endpoint-path {
        font-family: monospace;
        font-size: ${(props) => props.theme.font.size.sm};
        color: ${(props) => props.theme.text};
      }

      .endpoint-name {
        color: ${(props) => props.theme.colors.text.muted};
        font-size: ${(props) => props.theme.font.size.xs};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .changes-tag {
        font-size: ${(props) => props.theme.font.size.xs};
        padding: 0.125rem 0.375rem;
        background: ${(props) => props.theme.background.surface1};
        color: ${(props) => props.theme.colors.text.muted};
        border-radius: ${(props) => props.theme.border.radius.sm};
      }

      .endpoint-actions {
        display: flex;
        gap: 0.25rem;
        margin-left: auto;
        opacity: 0;
        transition: opacity 0.15s;
      }

      &:hover .endpoint-actions {
        opacity: 1;
      }
    }

    .review-row-diff {
      border-top: 1px solid ${(props) => props.theme.border.border1};
      background: ${(props) => props.theme.background.mantle};
    }

    .diff-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem;
      color: ${(props) => props.theme.colors.text.muted};
      font-size: ${(props) => props.theme.font.size.sm};

      .spinning {
        animation: spin 1s linear infinite;
      }
    }

    .diff-error {
      padding: 1rem;
      color: ${(props) => props.theme.colors.text.danger};
      font-size: ${(props) => props.theme.font.size.sm};
    }
  }

  .change-section {
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};

    .section-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: ${(props) => props.theme.background.mantle};
      border-radius: ${(props) => props.theme.border.radius.sm};
      cursor: pointer;
      user-select: none;

      &:hover {
        background: ${(props) => props.theme.background.surface0};
      }

      .section-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
        background: ${(props) => props.theme.colors.text.muted};

        &.type-added { background: ${(props) => props.theme.colors.text.green}; }
        &.type-modified { background: ${(props) => props.theme.colors.text.warning}; }
        &.type-removed { background: ${(props) => props.theme.colors.text.danger}; }
        &.type-missing { background: ${(props) => props.theme.colors.text.danger}; }
        &.type-local-only { background: ${(props) => props.theme.colors.text.muted}; }
        &.type-in-sync { background: ${(props) => props.theme.colors.text.green}; }
        &.type-conflict { background: ${(props) => props.theme.colors.text.danger}; }
        &.type-spec-modified { background: ${(props) => props.theme.colors.text.info}; }
        &.type-collection-drift { background: ${(props) => props.theme.colors.text.warning}; }
      }

      .section-title {
        font-size: ${(props) => props.theme.font.size.xs};
        font-weight: 600;
        color: ${(props) => props.theme.text};
      }

      .section-count {
        font-size: ${(props) => props.theme.font.size.xs};
        color: ${(props) => props.theme.colors.text.muted};
        background: ${(props) => props.theme.background.surface1};
        border: 1px solid ${(props) => props.theme.border.border1};
        padding: 0.125rem 0.375rem;
        border-radius: ${(props) => props.theme.border.radius.sm};
      }

      .section-subtitle {
        font-size: 10px;
        color: ${(props) => props.theme.colors.text.muted};
      }

      .section-conflict-badge-wrapper {
        position: relative;
        display: inline-flex;
        align-items: center;
        margin-left: 0.25rem;

        .section-conflict-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          padding: 0.125rem 0.375rem;
          border-radius: ${(props) => props.theme.border.radius.sm};
          font-weight: 500;
          background: ${(props) => props.theme.status.danger.background};
          color: ${(props) => props.theme.status.danger.text};
          cursor: default;
        }

        .section-conflict-tooltip {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          width: 260px;
          padding: 0.5rem 0.75rem;
          font-size: ${(props) => props.theme.font.size.sm};
          font-weight: 400;
          background-color: ${(props) => props.theme.infoTip.bg};
          border: 1px solid ${(props) => props.theme.infoTip.border};
          box-shadow: ${(props) => props.theme.infoTip.boxShadow};
          border-radius: 0.375rem;
          z-index: 50;
          white-space: normal;
          line-height: 1.4;
        }
      }

      .section-actions {
        margin-left: auto;
      }
    }

    /* When section body is visible, flatten header's bottom radius */
    &.expanded .section-header {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }

    .section-body {
      border-top: 1px solid ${(props) => props.theme.border.border1};
      border-bottom-left-radius: ${(props) => props.theme.border.radius.sm};
      border-bottom-right-radius: ${(props) => props.theme.border.radius.sm};
      max-height: 300px;
      overflow-y: auto;

      &.expandable-mode {
        max-height: none;
        overflow-y: visible;
      }
    }
  }

  /* Chevron */
  .chevron {
    color: ${(props) => props.theme.colors.text.muted};
    transition: transform 0.15s ease;
    flex-shrink: 0;

    &.expanded {
      transform: rotate(90deg);
    }
  }

  /* Endpoint Items */
  .endpoint-item {
    border-bottom: 1px solid ${(props) => props.theme.border.border1};

    &:last-child {
      border-bottom: none;
    }

    .endpoint-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      font-size: ${(props) => props.theme.font.size.sm};

      &.clickable {
        cursor: pointer;

        &:hover {
          background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
        }
      }

      .endpoint-path {
        font-family: monospace;
        color: ${(props) => props.theme.text};
      }

      .endpoint-summary {
        flex: 1;
        color: ${(props) => props.theme.colors.text.muted};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .deprecated-tag {
        font-size: ${(props) => props.theme.font.size.xs};
        padding: 0.125rem 0.375rem;
        background: ${(props) => props.theme.status.warning.background};
        color: ${(props) => props.theme.status.warning.text};
        border-radius: ${(props) => props.theme.border.radius.sm};
      }

      .changes-tag {
        font-size: ${(props) => props.theme.font.size.xs};
        padding: 0.125rem 0.5rem;
        background: ${(props) => props.theme.status.warning.background};
        color: ${(props) => props.theme.status.warning.text};
        border-radius: ${(props) => props.theme.border.radius.sm};
        font-weight: 500;
      }

      .endpoint-actions {
        display: flex;
        gap: 0.25rem;
        margin-left: auto;
        opacity: 0;
        transition: opacity 0.15s;
      }

      &:hover .endpoint-actions {
        opacity: 1;
      }
    }
  }

  /* Action Buttons */
  .action-btn {
    padding: 0.25rem;
    background: none;
    border: none;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: ${(props) => props.theme.border.radius.sm};

    &:hover {
      background: ${(props) => props.theme.background.surface1};
      color: ${(props) => props.theme.text};
    }

    &.action-btn-danger:hover {
      background: ${(props) => props.theme.status.danger.background};
      color: ${(props) => props.theme.status.danger.text};
    }

    &.action-btn-success {
      color: ${(props) => props.theme.colors.text.green};

      &:hover {
        background: ${(props) => props.theme.status.success.background};
      }
    }

    &.action-btn-warning {
      color: ${(props) => props.theme.colors.text.warning};

      &:hover {
        background: ${(props) => props.theme.status.warning.background};
      }
    }

    &.action-btn-danger {
      color: ${(props) => props.theme.colors.text.danger};

      &:hover {
        background: ${(props) => props.theme.status.danger.background};
      }
    }
  }

  /* Metadata Items */
  .metadata-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    font-size: ${(props) => props.theme.font.size.sm};
    border-left: 2px solid ${(props) => props.theme.colors.text.info};

    .metadata-label {
      font-weight: 500;
      color: ${(props) => props.theme.text};
      min-width: 80px;
    }

    .metadata-value {
      font-family: monospace;

      &.old {
        color: ${(props) => props.theme.colors.text.danger};
        text-decoration: line-through;
        opacity: 0.7;
      }

      &.new {
        color: ${(props) => props.theme.colors.text.green};
      }

      &.muted {
        color: ${(props) => props.theme.colors.text.muted};
        font-style: italic;
      }
    }

    .metadata-arrow {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  /* Endpoint Details */
  .endpoint-details {
    padding: 0.75rem;
    background: ${(props) => props.theme.background.surface0};
    border-top: 1px solid ${(props) => props.theme.border.border1};

    .detail-group {
      margin-bottom: 0.75rem;

      &:last-child {
        margin-bottom: 0;
      }

      .detail-title {
        font-size: ${(props) => props.theme.font.size.xs};
        font-weight: 600;
        text-transform: uppercase;
        color: ${(props) => props.theme.colors.text.muted};
        margin-bottom: 0.375rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .description-text {
        font-size: ${(props) => props.theme.font.size.sm};
        color: ${(props) => props.theme.text};
        line-height: 1.5;
        margin: 0;
      }
    }

    .params-table {
      width: 100%;
      font-size: ${(props) => props.theme.font.size.xs};
      border-collapse: collapse;

      td {
        padding: 0.25rem 0.5rem;
        border-bottom: 1px solid ${(props) => props.theme.border.border1};
        vertical-align: top;

        &:first-child {
          padding-left: 0;
        }

        &:last-child {
          padding-right: 0;
        }
      }

      tr:last-child td {
        border-bottom: none;
      }

      .param-name {
        font-family: monospace;
        font-weight: 500;
        color: ${(props) => props.theme.text};
        white-space: nowrap;
      }

      .param-type {
        color: ${(props) => props.theme.colors.text.subtext0};
        white-space: nowrap;
      }

      .param-desc {
        color: ${(props) => props.theme.colors.text.muted};
      }
    }

    .required-badge {
      font-size: 10px;
      padding: 0.125rem 0.25rem;
      background: ${(props) => props.theme.status.danger.background};
      color: ${(props) => props.theme.status.danger.text};
      border-radius: ${(props) => props.theme.border.radius.sm};
    }

    .content-type-badge {
      display: inline-block;
      font-size: ${(props) => props.theme.font.size.xs};
      padding: 0.125rem 0.375rem;
      background: ${(props) => props.theme.background.surface1};
      color: ${(props) => props.theme.colors.text.muted};
      border-radius: ${(props) => props.theme.border.radius.sm};
      margin-bottom: 0.5rem;
    }

    .schema-block {
      font-family: monospace;
      font-size: 11px;
      background: ${(props) => props.theme.background.surface1};
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: ${(props) => props.theme.border.radius.sm};
      padding: 0.5rem;
      margin: 0;
      overflow-x: auto;
      max-height: 120px;
      color: ${(props) => props.theme.text};
    }

    .responses-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .response-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: ${(props) => props.theme.font.size.xs};

      .status-code {
        font-family: monospace;
        font-weight: 500;
        padding: 0.125rem 0.375rem;
        border-radius: ${(props) => props.theme.border.radius.sm};

        &.status-2xx {
          background: ${(props) => props.theme.status.success.background};
          color: ${(props) => props.theme.status.success.text};
        }
        &.status-3xx {
          background: ${(props) => props.theme.status.info.background};
          color: ${(props) => props.theme.status.info.text};
        }
        &.status-4xx {
          background: ${(props) => props.theme.status.warning.background};
          color: ${(props) => props.theme.status.warning.text};
        }
        &.status-5xx {
          background: ${(props) => props.theme.status.danger.background};
          color: ${(props) => props.theme.status.danger.text};
        }
      }

      .response-desc {
        color: ${(props) => props.theme.colors.text.muted};
      }
    }
  }

  /* Info Note */
  .info-note {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.5rem;
    background: ${(props) => props.theme.status.info.background};
    border-radius: ${(props) => props.theme.border.radius.sm};
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.status.info.text};
    line-height: 1.4;

    &-icon {
      padding-top: 2px;
    }
  }

  .ml-2 {
    margin-left: 0.5rem;
  }

  .mt-4 {
    margin-top: 1rem;
  }

  /* Disconnect Modal */
  .disconnect-modal {
    .disconnect-message {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.muted};
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }

    .disconnect-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.muted};
      cursor: pointer;
      margin-bottom: 1.5rem;

      input[type="checkbox"] {
        cursor: pointer;
      }
    }

    .disconnect-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  }

  /* Action Confirm Modal */
  .action-confirm-modal {
    .confirm-message {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.muted};
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }

    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  }

  /* Remove Endpoints Modal List */
  .remove-endpoints-list {
    max-height: 12rem;
    overflow-y: auto;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.base};
    background: ${(props) => props.theme.background.default};

    .endpoint-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid ${(props) => props.theme.border.border1};

      &:last-child {
        border-bottom: none;
      }

      &.selectable {
        cursor: pointer;

        &:hover {
          background: ${(props) => props.theme.background.surface1};
        }
      }
    }

    .endpoint-path {
      font-family: monospace;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .endpoint-summary {
      color: ${(props) => props.theme.colors.text.muted};
      font-size: ${(props) => props.theme.font.size.xs};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 40%;
    }

    input[type="checkbox"] {
      accent-color: ${(props) => props.theme.colors.primary};
      cursor: pointer;
    }
  }

  .removal-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
    padding: 0 0.25rem;
  }

  .removal-count {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin-left: 1.25rem;
  }

  .removal-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .removal-separator {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .text-link {
    color: ${(props) => props.theme.colors.primary};
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: ${(props) => props.theme.font.size.xs};

    &:hover {
      text-decoration: underline;
    }
  }

  .hover\\:bg-surface1:hover {
    background: ${(props) => props.theme.background.surface1};
  }

  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .max-w-48 {
    max-width: 12rem;
  }

  .border {
    border: 1px solid ${(props) => props.theme.border.border1};
  }

  .border-b {
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .last\\:border-b-0:last-child {
    border-bottom: none;
  }

  .rounded {
    border-radius: ${(props) => props.theme.border.radius.sm};
  }

  .max-h-64 {
    max-height: 16rem;
  }

  .text-muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  /* Drift Diff Modal */
  .drift-diff-modal {
    padding: 1rem;

    .drift-diff-header {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid ${(props) => props.theme.border.border1};

      .drift-diff-column {
        flex: 1;
      }

      .column-label {
        font-size: ${(props) => props.theme.font.size.sm};
        font-weight: 600;
        color: ${(props) => props.theme.text};
      }
    }

    .diff-section {
      margin-bottom: 1rem;

      .diff-section-title {
        font-size: ${(props) => props.theme.font.size.sm};
        font-weight: 600;
        color: ${(props) => props.theme.text};
        margin-bottom: 0.5rem;
      }

      .diff-section-content {
        background: ${(props) => props.theme.background.surface0};
        border: 1px solid ${(props) => props.theme.border.border1};
        border-radius: ${(props) => props.theme.border.radius.sm};
        overflow: hidden;
      }

      .diff-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0.75rem;
        font-size: ${(props) => props.theme.font.size.sm};
        font-family: monospace;
        border-bottom: 1px solid ${(props) => props.theme.border.border1};

        &:last-child {
          border-bottom: none;
        }

        &.added {
          background: ${(props) => props.theme.status.success.background};
          .diff-marker { color: ${(props) => props.theme.colors.text.green}; }
        }

        &.removed {
          background: ${(props) => props.theme.status.danger.background};
          .diff-marker { color: ${(props) => props.theme.colors.text.danger}; }
        }

        .diff-marker {
          font-weight: 700;
          width: 1rem;
        }

        .diff-name {
          font-weight: 500;
          color: ${(props) => props.theme.text};
        }

        .diff-label {
          color: ${(props) => props.theme.colors.text.muted};
          font-size: ${(props) => props.theme.font.size.xs};
          font-family: inherit;
        }
      }
    }

    .drift-diff-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid ${(props) => props.theme.border.border1};
    }
  }

  /* Sync Review Modal */
  .sync-review-page {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;

    .sync-review-header {
      flex-shrink: 0;
      padding-bottom: 0.75rem;

      .back-link-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.75rem;
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: ${(props) => props.theme.font.size.sm};
        color: ${(props) => props.theme.colors.text.muted};
        cursor: pointer;

        &:hover {
          color: ${(props) => props.theme.text};
        }
      }

      .title-row, .description-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 0.25rem;
      }

      .review-title {
        font-size: ${(props) => props.theme.font.size.base};
        font-weight: 600;
        color: ${(props) => props.theme.text};
        margin: 0;
      }

      .review-badges {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.375rem;

        .badge-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
      }

      .review-subtitle {
        font-size: ${(props) => props.theme.font.size.sm};
        color: ${(props) => props.theme.colors.text.muted};
      }
    }

    .context-pill {
      font-size: ${(props) => props.theme.font.size.xs};
      padding: 0.125rem 0.5rem;
      border-radius: ${(props) => props.theme.border.radius.sm};
      background: ${(props) => props.theme.background.surface1};
      color: ${(props) => props.theme.colors.text.muted};
      white-space: nowrap;
      font-weight: 500;

      &.spec {
        background: ${(props) => props.theme.status.info.background};
        color: ${(props) => props.theme.status.info.text};
      }

      &.drift {
        background: ${(props) => props.theme.status.warning.background};
        color: ${(props) => props.theme.status.warning.text};
      }

      &.conflict {
        background: ${(props) => props.theme.status.danger.background};
        color: ${(props) => props.theme.status.danger.text};
      }

      &.added {
        background: ${(props) => props.theme.status.success.background};
        color: ${(props) => props.theme.colors.text.green};
      }

      &.removed {
        background: ${(props) => props.theme.status.danger.background};
        color: ${(props) => props.theme.colors.text.danger};
      }
    }

    .text-diff-container {
      border-radius: ${(props) => props.theme.border.radius.sm};
      border: 1px solid ${(props) => props.theme.border.border1};
      overflow: hidden;

      .diff-column-headers {
        display: flex;
        border-bottom: 1px solid ${(props) => props.theme.border.border1};

        .diff-column-label {
          flex: 1;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          color: ${(props) => props.theme.colors.text.muted};

          &:first-child {
            border-right: 1px solid ${(props) => props.theme.border.border1};
          }
        }
      }

      .d2h-wrapper {
        background-color: ${(props) => props.theme.bg} !important;
        font-family: 'Fira Code', monospace;
        font-size: 12px;
      }

      .d2h-file-wrapper {
        border: none;
        border-radius: 0;
        margin-bottom: 0;
      }

      .d2h-file-header {
        display: none;
      }

      .d2h-files-diff {
        width: 100%;

        .d2h-file-side-diff:first-child {
          border-right: 1px solid ${(props) => props.theme.border.border1};
        }
      }

      .d2h-code-side-linenumber {
        background: transparent !important;
        position: static !important;
      }

      .d2h-diff-tbody {
        tr td { border: none !important; }
      }

      .d2h-ins {
        background-color: color-mix(in srgb, ${(props) => props.theme.colors.text.green} 15%, transparent) !important;
        border-color: color-mix(in srgb, ${(props) => props.theme.colors.text.green} 40%, transparent) !important;
      }

      .d2h-del {
        background-color: color-mix(in srgb, ${(props) => props.theme.colors.text.danger} 15%, transparent) !important;
        border-color: color-mix(in srgb, ${(props) => props.theme.colors.text.danger} 40%, transparent) !important;
      }

      .d2h-file-diff .d2h-ins.d2h-change {
        background-color: color-mix(in srgb, ${(props) => props.theme.colors.text.green} 25%, transparent) !important;
      }

      .d2h-file-diff .d2h-del.d2h-change {
        background-color: color-mix(in srgb, ${(props) => props.theme.colors.text.warning} 20%, transparent) !important;
      }

      .d2h-code-line ins,
      .d2h-code-side-line ins {
        background-color: color-mix(in srgb, ${(props) => props.theme.colors.text.green} 40%, transparent) !important;
        text-decoration: none;
      }

      .d2h-code-line del,
      .d2h-code-side-line del {
        background-color: color-mix(in srgb, ${(props) => props.theme.colors.text.danger} 40%, transparent) !important;
        text-decoration: none;
      }

      .d2h-code-line,
      .d2h-code-side-line {
        color: ${(props) => props.theme.text} !important;
        word-break: break-all;
      }

      .d2h-code-line-ctn {
        word-break: break-all;
      }

      .d2h-tag {
        font-size: 9px;
        font-weight: 500;
        padding: 1px 5px;
        border-radius: ${(props) => props.theme.border.radius.sm};
        text-transform: uppercase;
        letter-spacing: 0.02em;
        border: none;
      }

      .d2h-changed-tag {
        background-color: color-mix(in srgb, ${(props) => props.theme.colors.text.warning} 15%, transparent);
        color: ${(props) => props.theme.colors.text.warning};
      }

      .d2h-added-tag {
        background-color: color-mix(in srgb, ${(props) => props.theme.colors.text.green} 13%, transparent);
        color: ${(props) => props.theme.colors.text.green};
      }

      .d2h-deleted-tag {
        background-color: color-mix(in srgb, ${(props) => props.theme.colors.text.danger} 13%, transparent);
        color: ${(props) => props.theme.colors.text.danger};
      }

      .d2h-renamed-tag,
      .d2h-moved-tag {
        display: none;
      }

      .d2h-file-wrapper,
      .d2h-file-diff,
      .d2h-code-wrapper,
      .d2h-diff-table,
      .d2h-code-line,
      .d2h-code-side-line,
      .d2h-code-line-ctn,
      .d2h-code-linenumber,
      .d2h-code-side-linenumber {
        font-family: 'Fira Code', monospace !important;
        font-size: 12px !important;
      }
    }

    .text-diff-empty {
      padding: 2rem;
      text-align: center;
      color: ${(props) => props.theme.colors.text.muted};
      font-size: ${(props) => props.theme.font.size.sm};
    }

    .spec-diff-modal {
      .spec-diff-badges {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.5rem;
      }

      .spec-diff-subtitle {
        font-size: ${(props) => props.theme.font.size.sm};
        color: ${(props) => props.theme.colors.text.muted};
        margin: 0 0 0.75rem 0;
      }

      .spec-diff-body {
        max-height: calc(80vh - 140px);
        overflow: auto;
      }
    }

    .review-actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: ${(props) => props.theme.background.surface0};
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: ${(props) => props.theme.border.radius.md};
      margin-bottom: 0.75rem;
    }

    .review-stats {
      display: flex;
      gap: 1rem;
      font-size: ${(props) => props.theme.font.size.sm};

      .stat {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;

        &.add { color: ${(props) => props.theme.colors.text.green}; }
        &.update { color: ${(props) => props.theme.status.info.text}; }
        &.remove { color: ${(props) => props.theme.colors.text.danger}; }
        &.keep { color: ${(props) => props.theme.colors.text.muted}; }
      }
    }

    .bulk-actions {
      display: flex;
      gap: 0.5rem;
    }

    .bulk-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      font-size: ${(props) => props.theme.font.size.xs};
      background: none;
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: ${(props) => props.theme.border.radius.sm};
      color: ${(props) => props.theme.text};
      cursor: pointer;

      &:hover {
        background: ${(props) => props.theme.background.surface1};
      }

      &.active {
        border-color: ${(props) => props.theme.status.info.text};
        color: ${(props) => props.theme.status.info.text};
        background: ${(props) => props.theme.status.info.background};
      }
    }

    .sync-review-body {
      flex: 1;
      overflow-y: auto;
    }

    &.sync-mode .sync-review-body {
      margin-top: -36px;
    }

    .sync-review-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
      color: var(--color-text-muted, #6b7280);

      .empty-state-icon {
        color: var(--color-method-get, #22c55e);
        margin-bottom: 1rem;
      }

      h4 {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--color-text-primary, #1f2937);
        margin: 0 0 0.5rem 0;
      }

      p {
        font-size: 0.875rem;
        line-height: 1.5;
        max-width: 400px;
        margin: 0;
      }
    }

    .endpoints-review-sections {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;

      .review-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .review-group-header {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }

      .review-group-title {
        font-size: ${(props) => props.theme.font.size.sm};
        font-weight: 600;
        color: ${(props) => props.theme.colors.text.muted};
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0;
      }

      .change-section {
        .section-subtitle {
          font-size: ${(props) => props.theme.font.size.xs};
          color: ${(props) => props.theme.colors.text.muted};
          margin-left: 0.25rem;
        }

        .section-body {
          max-height: none;

          &.expandable-mode {
            /* border: 1px solid ${(props) => props.theme.border.border1}; */
            border-top: none;
            border-radius: 0 0 ${(props) => props.theme.border.radius.sm} ${(props) => props.theme.border.radius.sm};
          }
        }
      }
    }

    .endpoint-review-row {
      .review-row-header {
        .source-tag {
          font-size: 10px;
          padding: 0.125rem 0.375rem;
          border-radius: ${(props) => props.theme.border.radius.sm};
          font-weight: 500;

          &.spec {
            background: ${(props) => props.theme.status.info.background};
            color: ${(props) => props.theme.status.info.text};
          }

          &.drift {
            background: ${(props) => props.theme.status.warning.background};
            color: ${(props) => props.theme.status.warning.text};
          }

          &.conflict {
            background: ${(props) => props.theme.status.danger.background};
            color: ${(props) => props.theme.status.danger.text};
          }

          &.local-modified, &.local-deleted, &.local-added {
            background: ${(props) => props.theme.status.warning.background};
            color: ${(props) => props.theme.status.warning.text};
          }

          &.spec-modified, &.spec-added {
            background: ${(props) => props.theme.status.info.background};
            color: ${(props) => props.theme.status.info.text};
          }

          &.spec-removed {
            background: ${(props) => props.theme.status.danger.background};
            color: ${(props) => props.theme.status.danger.text};
          }
        }

        .conflict-badge-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;

          .conflict-badge {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            font-size: 10px;
            padding: 0.125rem 0.375rem;
            border-radius: ${(props) => props.theme.border.radius.sm};
            font-weight: 500;
            background: ${(props) => props.theme.status.danger.background};
            color: ${(props) => props.theme.status.danger.text};
            cursor: default;
          }

          .conflict-tooltip {
            position: absolute;
            bottom: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
            width: 240px;
            padding: 0.5rem 0.75rem;
            font-size: ${(props) => props.theme.font.size.sm};
            font-weight: 400;
            background-color: ${(props) => props.theme.infoTip.bg};
            border: 1px solid ${(props) => props.theme.infoTip.border};
            box-shadow: ${(props) => props.theme.infoTip.boxShadow};
            border-radius: 0.375rem;
            z-index: 50;
            white-space: normal;
            line-height: 1.4;
          }
        }
      }

      .decision-buttons {
        display: flex;
        gap: 0.25rem;
        margin-left: auto;
      }

      .decision-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        font-size: ${(props) => props.theme.font.size.xs};
        background: none;
        border: 1px solid ${(props) => props.theme.border.border1};
        border-radius: ${(props) => props.theme.border.radius.sm};
        color: ${(props) => props.theme.colors.text.muted};
        cursor: pointer;

        &:hover {
          background: ${(props) => props.theme.background.surface1};
        }

        &.keep.selected {
          background: ${(props) => props.theme.background.surface1};
          border-color: ${(props) => props.theme.colors.text.muted};
          color: ${(props) => props.theme.text};
        }

        &.accept.selected {
          background: ${(props) => props.theme.status.success.background};
          border-color: ${(props) => props.theme.colors.text.green};
          color: ${(props) => props.theme.colors.text.green};
        }
      }

      .review-row-diff {
        background: ${(props) => props.theme.background.mantle};
      }

      .endpoint-diff-view {
        .diff-section {
          margin-bottom: 0.5rem;

          &:last-child {
            margin-bottom: 0;
          }
        }

        .url-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem;
          background: ${(props) => props.theme.background.surface0};
          border-radius: ${(props) => props.theme.border.radius.sm};

          .url {
            font-family: monospace;
            font-size: ${(props) => props.theme.font.size.xs};
            color: ${(props) => props.theme.text};
            word-break: break-all;
          }
        }

        .diff-section-title {
          font-size: ${(props) => props.theme.font.size.xs};
          font-weight: 600;
          color: ${(props) => props.theme.colors.text.muted};
          margin-bottom: 0.25rem;
        }

        .diff-table {
          width: 100%;
          font-size: ${(props) => props.theme.font.size.xs};
          border-collapse: collapse;
          border: 1px solid ${(props) => props.theme.border.border1};
          border-radius: ${(props) => props.theme.border.radius.sm};

          th, td {
            padding: 0.25rem 0.5rem;
            text-align: left;
            border-bottom: 1px solid ${(props) => props.theme.border.border1};
          }

          th {
            background: ${(props) => props.theme.background.surface1};
            color: ${(props) => props.theme.colors.text.muted};
            font-weight: 500;
          }

          tr:last-child td {
            border-bottom: none;
          }

          .row-added {
            background: ${(props) => props.theme.status.success.background};
          }

          .row-deleted {
            background: ${(props) => props.theme.status.danger.background};
          }

          .row-modified {
            background: ${(props) => props.theme.status.warning.background};
          }

          .status-badge {
            display: inline-block;
            width: 14px;
            height: 14px;
            text-align: center;
            line-height: 14px;
            font-size: 10px;
            font-weight: 700;
            border-radius: 2px;

            &.added {
              background: ${(props) => props.theme.status.success.background};
              color: ${(props) => props.theme.colors.text.green};
            }

            &.deleted {
              background: ${(props) => props.theme.status.danger.background};
              color: ${(props) => props.theme.colors.text.danger};
            }

            &.modified {
              background: ${(props) => props.theme.status.warning.background};
              color: ${(props) => props.theme.colors.text.warning};
            }
          }

          .key-cell {
            font-family: monospace;
            font-weight: 500;
          }

          .value-cell {
            font-family: monospace;
            color: ${(props) => props.theme.colors.text.muted};
          }
        }

        .body-mode-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          font-size: ${(props) => props.theme.font.size.xs};
          background: ${(props) => props.theme.background.surface1};
          color: ${(props) => props.theme.colors.text.muted};
          border-radius: ${(props) => props.theme.border.radius.sm};
          font-family: monospace;
        }

        .empty-diff {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.colors.text.muted};
          font-style: italic;
        }
      }
    }

    .sync-review-bottom-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      bottom: 0rem;
      background: ${(props) => props.theme.background.base};
      margin-top: 1rem;
      /* box-shadow: 0 -4px 12px -4px rgba(0, 0, 0, 0.3); */
      z-index: 10;
      padding-top: 0.75rem;
      padding-bottom: 0.75rem;


      .bar-stats {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: ${(props) => props.theme.font.size.sm};

        .stats-prefix {
          color: ${(props) => props.theme.colors.text.muted};
        }

        .stat {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          position: relative;
          cursor: default;

          &.add { color: ${(props) => props.theme.colors.text.green}; }
          &.update { color: ${(props) => props.theme.status.info.text}; }
          &.remove { color: ${(props) => props.theme.colors.text.danger}; }
          &.keep { color: ${(props) => props.theme.colors.text.muted}; }

          .stat-hover-card {
            transform: translateX(-50%);
            background: ${(props) => props.theme.background.base};
            border: 1px solid ${(props) => props.theme.border.border1};
            border-radius: ${(props) => props.theme.border.radius.md};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            padding: 0.5rem;
            min-width: 200px;
            max-width: 320px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 100;
          }

          .stat-hover-list {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .stat-hover-item {
            display: flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.2rem 0.25rem;
            border-radius: ${(props) => props.theme.border.radius.sm};

            &:hover {
              background: ${(props) => props.theme.background.hover};
            }
          }

          .stat-hover-path {
            font-size: ${(props) => props.theme.font.size.xs};
            font-family: monospace;
            color: ${(props) => props.theme.text};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      }

      .bar-actions {
        display: flex;
        gap: 0.5rem;
      }
    }

  }

  .sync-confirm-modal {
    display: flex;
    flex-direction: column;
    max-height: 60vh;

    .sync-confirm-description {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.muted};
      margin: 0 0 0.75rem 0;
      flex-shrink: 0;
    }

    .sync-confirm-groups {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    .confirm-group {
      .confirm-group-header {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.25rem 0;
        cursor: pointer;
        user-select: none;

        .chevron {
          color: ${(props) => props.theme.colors.text.muted};
          transition: transform 0.15s ease;
          flex-shrink: 0;
          &.expanded { transform: rotate(90deg); }
        }
      }

      .confirm-group-label {
        font-size: ${(props) => props.theme.font.size.sm};
        font-weight: 500;
      }

      .confirm-group-count {
        font-size: ${(props) => props.theme.font.size.xs};
        color: ${(props) => props.theme.colors.text.muted};
      }

      .confirm-group-subtitle {
        font-size: ${(props) => props.theme.font.size.xs};
        color: ${(props) => props.theme.colors.text.muted};
        font-weight: 400;
      }

      &.type-add .confirm-group-label { color: ${(props) => props.theme.colors.text.green}; }
      &.type-update .confirm-group-label { color: ${(props) => props.theme.status.info.text}; }
      &.type-remove .confirm-group-label { color: ${(props) => props.theme.colors.text.danger}; }
      &.type-keep .confirm-group-label { color: ${(props) => props.theme.colors.text.muted}; }

      .remove-endpoints-list {
        margin-top: 0.5rem;
        margin-left: 1.25rem;
      }

      .confirm-group-body {
        margin-top: 0.5rem;
      }

      .confirm-group-endpoints {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        padding-left: 1.25rem;
      }

      .confirm-endpoint {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.125rem 0.25rem;
      }

      .confirm-endpoint-path {
        font-family: monospace;
        font-size: ${(props) => props.theme.font.size.xs};
        color: ${(props) => props.theme.text};
      }
    }

    .sync-confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      flex-shrink: 0;
    }
  }

  /* Visual Diff Content Overrides */
  .visual-diff-content {
    margin: 0.75rem;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};

    .diff-header-row {
      border-top: none;
      border-left: none;
      border-right: none;
      border-radius: 0;
      margin-bottom: 0;
      background: ${(props) => props.theme.background.surface0};
    }

    .diff-sections {
      gap: 0;
    }

    .diff-row {
      border-top: none;
      border-left: none;
      border-right: none;
      border-radius: 0;
      margin-bottom: 0;
      &:last-child {
        border-bottom: none;
      }
    }
  }

  &.review-active {
    padding-bottom: 0;
  }

  /* URL/File mode toggle in setup form and settings modal */
  .setup-mode-toggle {
    display: inline-flex;
    flex-shrink: 0;
    align-items: stretch;
    align-self: stretch;
    gap: 2px;
    padding: 2px;
    background: ${(props) => props.theme.button2.color.secondary.bg};
    border: 1px solid ${(props) => props.theme.button2.color.secondary.border};
    border-radius: ${(props) => props.theme.border.radius.md};
  }

  .setup-mode-btn {
    padding: 0 0.65rem;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    border: none;
    border-radius: calc(${(props) => props.theme.border.radius.md} - 3px);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap;

    &.active {
      background: ${(props) => darken(0.03, props.theme.button2.color.secondary.bg)};
      color: ${(props) => props.theme.button2.color.secondary.text};
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
    }

    &:hover:not(.active) {
      color: ${(props) => props.theme.text};
    }
  }

  .file-pick-btn {
    text-align: left;
    cursor: pointer;
    font-family: monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${(props) => props.theme.colors.text.muted};
  }

  /* File not found banner */
  .file-not-found-banner {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    margin-bottom: 0.75rem;
    background: ${(props) => rgba(props.theme.colors.text.yellow || '#f59e0b', 0.08)};
    border: 1px solid ${(props) => rgba(props.theme.colors.text.yellow || '#f59e0b', 0.3)};
    border-radius: ${(props) => props.theme.border.radius.md};
  }

  .file-not-found-content {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    flex: 1;
    min-width: 0;
  }

  .file-not-found-icon {
    flex-shrink: 0;
    margin-top: 1px;
    color: ${(props) => props.theme.colors.text.yellow || '#f59e0b'};
  }

  .file-not-found-title {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 600;
    color: ${(props) => props.theme.text};
    margin-bottom: 0.125rem;
  }

  .file-not-found-desc {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    word-break: break-all;

    code {
      font-family: monospace;
      font-size: ${(props) => props.theme.font.size.xs};
    }
  }

  .file-not-found-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
`;

export default StyledWrapper;
