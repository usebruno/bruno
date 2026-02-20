import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  /* Full-screen overlay */
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);

  .welcome-card {
    background: ${(props) => props.theme.modal.body.bg};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.xl};
    box-shadow: ${(props) => props.theme.shadow.lg};
    width: 660px;
    max-width: 92vw;
    max-height: 90vh;
    overflow-y: auto;
    animation: welcomeSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes welcomeSlideIn {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* ── Header ── */
  .welcome-header {
    text-align: center;
    padding: 2.25rem 2.5rem 0 2.5rem;
  }

  .logo-container {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.75rem;
  }

  .welcome-heading {
    font-size: 1.375rem;
    font-weight: 700;
    color: ${(props) => props.theme.text};
    margin: 0;
    line-height: 1.3;
  }

  .welcome-tagline {
    color: ${(props) => props.theme.colors.text.subtext1};
    font-size: 0.875rem;
    margin-top: 0.25rem;
    line-height: 1.5;
  }

  /* ── Step body ── */
  .step-body {
    padding: 1.5rem 2.5rem;
  }

  /* ── Highlights (Step 1) ── */
  .highlights {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .highlight-item {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;

    .highlight-icon {
      flex-shrink: 0;
      width: 34px;
      height: 34px;
      border-radius: ${(props) => props.theme.border.radius.base};
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${(props) => rgba(props.theme.primary.solid, 0.1)};
      color: ${(props) => props.theme.primary.solid};
      margin-top: 1px;
    }

    .highlight-title {
      font-weight: 600;
      font-size: 0.8125rem;
      color: ${(props) => props.theme.text};
      margin-bottom: 0.125rem;
    }

    .highlight-desc {
      font-size: 0.75rem;
      color: ${(props) => props.theme.colors.text.subtext1};
      line-height: 1.45;
    }
  }

  .step-label {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${(props) => props.theme.primary.text};
    margin-bottom: 0.375rem;
  }

  .step-title {
    font-size: 1.05rem;
    font-weight: 600;
    color: ${(props) => props.theme.text};
    margin-bottom: 0.25rem;
  }

  .step-description {
    color: ${(props) => props.theme.colors.text.subtext1};
    font-size: 0.8125rem;
    line-height: 1.5;
    margin-bottom: 1.25rem;
  }

  /* ── Primary action cards ── */
  .primary-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .primary-action-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.25rem 1rem;
    border-radius: ${(props) => props.theme.border.radius.md};
    border: 1px solid ${(props) => props.theme.border.border1};
    background: transparent;
    cursor: pointer;
    text-align: center;
    color: ${(props) => props.theme.text};
    transition: all 0.15s ease;

    &:hover {
      border-color: ${(props) => props.theme.primary.subtle};
      background: ${(props) => rgba(props.theme.primary.solid, 0.06)};
    }

    &:active {
      transform: scale(0.98);
    }

    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: ${(props) => props.theme.border.radius.md};
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${(props) => rgba(props.theme.primary.solid, 0.1)};
      color: ${(props) => props.theme.primary.solid};
    }

    .card-title {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .card-desc {
      font-size: 0.75rem;
      color: ${(props) => props.theme.colors.text.subtext0};
      line-height: 1.4;
    }
  }

  /* ── Secondary action row ── */
  .secondary-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .secondary-action {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    border: 1px solid ${(props) => props.theme.border.border0};
    background: transparent;
    cursor: pointer;
    text-align: left;
    width: 100%;
    color: ${(props) => props.theme.text};
    transition: all 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      border-color: ${(props) => props.theme.border.border1};
    }

    .secondary-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: ${(props) => props.theme.colors.text.subtext0};
    }

    .secondary-label {
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .secondary-desc {
      font-size: 0.6875rem;
      color: ${(props) => props.theme.colors.text.subtext0};
    }

    &.highlighted {
      border-color: ${(props) => props.theme.primary.subtle};
      background: ${(props) => rgba(props.theme.primary.solid, 0.04)};

      .secondary-icon {
        color: ${(props) => props.theme.primary.solid};
      }

      &:hover {
        background: ${(props) => rgba(props.theme.primary.solid, 0.08)};
        border-color: ${(props) => props.theme.primary.solid};
      }
    }
  }

  /* ── Theme selection ── */
  .theme-mode-buttons {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  .theme-mode-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.md};
    border: 1.5px solid ${(props) => props.theme.border.border1};
    background: transparent;
    color: ${(props) => props.theme.colors.text.subtext1};
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    transition: all 0.15s ease;

    &:hover {
      border-color: ${(props) => props.theme.border.border2};
      color: ${(props) => props.theme.text};
    }

    &.active {
      border-color: ${(props) => props.theme.primary.solid};
      background: ${(props) => rgba(props.theme.primary.solid, 0.07)};
      color: ${(props) => props.theme.text};
    }
  }

  .theme-variants-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
    gap: 0.5rem;
  }

  .theme-variant-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.375rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    border: 1.5px solid ${(props) => props.theme.border.border0};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: ${(props) => props.theme.border.border2};
    }

    &.selected {
      border-color: ${(props) => props.theme.primary.solid};
      background: ${(props) => rgba(props.theme.primary.solid, 0.06)};
    }

    .variant-name {
      font-size: 0.6875rem;
      color: ${(props) => props.theme.colors.text.subtext0};
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
  }

  .theme-preview-box {
    width: 52px;
    height: 34px;
    border-radius: 3px;
    display: flex;
    overflow: hidden;

    .preview-sidebar {
      width: 13px;
      height: 100%;
    }

    .preview-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 4px;
      gap: 3px;
    }

    .preview-line {
      height: 3px;
      border-radius: 2px;
    }
  }

  /* ── Location input ── */
  .location-input-group {
    margin-bottom: 0.5rem;
  }

  .location-path-display {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    border: 1px solid ${(props) => props.theme.input.border};
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    font-size: 0.8125rem;
    line-height: 1.42857143;
    cursor: pointer;
    transition: border-color 0.15s ease;
    gap: 0.625rem;
    min-height: 38px;

    &:hover {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    .path-text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .path-placeholder {
      color: ${(props) => props.theme.colors.text.subtext0};
    }

    .browse-label {
      flex-shrink: 0;
      font-size: 0.75rem;
      font-weight: 500;
      color: ${(props) => props.theme.primary.text};
    }
  }

  .location-hint {
    color: ${(props) => props.theme.colors.text.subtext0};
    font-size: 0.75rem;
    line-height: 1.4;
  }

  /* ── Footer ── */
  .welcome-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 2.5rem 1.75rem 2.5rem;
  }

  .progress-dots {
    display: flex;
    gap: 6px;
    align-items: center;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${(props) => props.theme.border.border2};
      transition: all 0.25s ease;
      cursor: pointer;

      &.active {
        background: ${(props) => props.theme.primary.solid};
        width: 20px;
        border-radius: 4px;
      }

      &.completed {
        background: ${(props) => rgba(props.theme.primary.solid, 0.45)};
      }
    }
  }

  .footer-buttons {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

`;

export default StyledWrapper;
