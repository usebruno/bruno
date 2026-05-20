import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: transparent;
  color: ${(props) => props.theme.text};
  font-family: Inter, sans-serif;

  &.empty-state {
    padding: 16px 4px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .page-header,
  .hero-card,
  .section-card,
  .summary-banner,
  .repo-details {
    background: ${(props) => rgba(props.theme.background.surface0, 0.75)};
    border: 1px solid ${(props) => props.theme.border.border1};
    box-shadow: ${(props) => props.theme.shadow.sm};
    backdrop-filter: blur(10px) saturate(1.05);
    -webkit-backdrop-filter: blur(10px) saturate(1.05);
  }

  .page-header,
  .hero-card,
  .section-card {
    padding: 18px;
    border-radius: ${(props) => props.theme.border.radius.lg};
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
  }

  .page-title-block {
    max-width: 56rem;
  }

  .header-badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
  }

  .header-actions-hint {
    flex-basis: 100%;
    margin: 0;
    text-align: right;
    font-size: 0.72rem;
    line-height: 1.45;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .top-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }

  .bottom-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }

  &.git-shell:not(.empty-state) {
    min-height: 100%;
    padding-bottom: 16px;
  }

  .git-sync-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border-radius: ${(props) => props.theme.border.radius.md};
    border: 1px solid ${(props) => props.theme.border.border1};
    background: ${(props) => rgba(props.theme.background.mantle, 0.65)};
    box-shadow: inset 0 1px 0 ${rgba(255, 255, 255, 0.04)};
  }

  .git-sync-actions-label {
    margin: 0;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .git-sync-actions-buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .git-sync-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 30px;
    padding: 5px 11px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    border: 1px solid transparent;
    cursor: pointer;
    transition:
      transform 0.12s ease,
      filter 0.12s ease,
      box-shadow 0.12s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .git-sync-btn:hover {
    transform: translateY(-1px);
    filter: brightness(1.03);
  }

  .git-sync-btn:active {
    transform: translateY(0);
  }

  .git-sync-btn--pull {
    color: ${(props) => props.theme.text};
    background: ${(props) => rgba(props.theme.primary.solid, 0.14)};
    border-color: ${(props) => rgba(props.theme.primary.solid, 0.35)};
    box-shadow: none;
  }

  .git-sync-btn--push {
    color: ${(props) => props.theme.status.info.text};
    background: ${(props) => props.theme.status.info.background};
    border-color: ${(props) => rgba(props.theme.status.info.border, 0.45)};
    box-shadow: none;
  }

  .git-sync-btn--force {
    color: ${(props) => props.theme.status.warning.text};
    background: ${(props) => props.theme.status.warning.background};
    border-color: ${(props) => rgba(props.theme.status.warning.border, 0.4)};
    box-shadow: none;
  }

  .git-sync-btn--refresh {
    width: 30px;
    min-width: 30px;
    padding: 0;
    color: ${(props) => props.theme.colors.text.subtext2};
    background: ${(props) => rgba(props.theme.background.surface1, 0.85)};
    border-color: ${(props) => props.theme.border.border2};
    box-shadow: inset 0 1px 0 ${rgba(255, 255, 255, 0.05)};
  }

  .signal-row-hero {
    margin-top: 2px;
  }

  .eyebrow {
    margin: 0 0 4px;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${(props) => props.theme.colors.text.muted};
  }

  h3,
  h4,
  p {
    margin: 0;
  }

  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: ${(props) => props.theme.text};
  }

  h4 {
    font-size: 0.9rem;
    font-weight: 600;
    color: ${(props) => props.theme.text};
  }

  .hero-text,
  .section-header p,
  .history-meta p,
  .subtle {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 0.75rem;
    line-height: 1.55;
  }

  .technical-text,
  .detail-value,
  .file-path,
  .metric-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    font-variant-numeric: tabular-nums;
  }

  .compact-header {
    margin-bottom: 14px;
  }

  .summary-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .summary-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: ${(props) => props.theme.border.radius.md};
    font-size: 0.8rem;
  }

  .summary-banner.warning {
    border-color: ${(props) => rgba(props.theme.status.warning.border, 0.35)};
    color: ${(props) => props.theme.status.warning.text};
    background: ${(props) => props.theme.status.warning.background};
  }

  .summary-banner.success {
    border-color: ${(props) => rgba(props.theme.status.success.border, 0.35)};
    color: ${(props) => props.theme.status.success.text};
    background: ${(props) => props.theme.status.success.background};
  }

  .summary-banner.muted {
    color: ${(props) => props.theme.colors.text.subtext2};
    background: ${(props) => rgba(props.theme.background.mantle, 0.65)};
    border-color: ${(props) => props.theme.border.border1};
  }

  .summary-banner svg {
    flex-shrink: 0;
  }

  .summary-banner.warning svg {
    color: ${(props) => props.theme.status.warning.text};
    opacity: 0.9;
  }

  .summary-banner.success svg {
    color: ${(props) => props.theme.status.success.text};
    opacity: 0.9;
  }

  .summary-banner.muted svg {
    color: ${(props) => props.theme.colors.text.muted};
    opacity: 0.85;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .metric-card {
    position: relative;
    border-radius: ${(props) => props.theme.border.radius.md};
    padding: 12px 12px 14px;
    min-height: 86px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 6px;
    overflow: hidden;
    backdrop-filter: blur(8px) saturate(1.05);
    -webkit-backdrop-filter: blur(8px) saturate(1.05);
    border-width: 1px;
    border-style: solid;
    box-shadow: ${(props) => props.theme.shadow.sm};
  }

  .metric-card--ahead {
    background: ${(props) => rgba(props.theme.background.mantle, 0.9)};
    border-color: ${(props) => props.theme.border.border1};
    border-left: 3px solid ${(props) => rgba(props.theme.primary.solid, 0.55)};
  }

  .metric-card--behind {
    background: ${(props) => rgba(props.theme.background.mantle, 0.9)};
    border-color: ${(props) => props.theme.border.border1};
    border-left: 3px solid ${(props) => rgba(props.theme.status.info.border, 0.5)};
  }

  .metric-card--locales {
    background: ${(props) => rgba(props.theme.background.mantle, 0.9)};
    border-color: ${(props) => props.theme.border.border1};
    border-left: 3px solid ${(props) => rgba(props.theme.status.success.border, 0.5)};
  }

  .metric-card--pendientes {
    background: ${(props) => rgba(props.theme.background.mantle, 0.9)};
    border-color: ${(props) => props.theme.border.border1};
    border-left: 3px solid ${(props) => rgba(props.theme.status.warning.border, 0.45)};
  }

  .metric-card .metric-label {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
  }

  .metric-card--ahead .metric-label,
  .metric-card--behind .metric-label,
  .metric-card--locales .metric-label,
  .metric-card--pendientes .metric-label {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .metric-card .metric-value {
    font-size: 1.75rem;
    line-height: 1;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .metric-card--ahead .metric-value {
    color: ${(props) => props.theme.text};
  }

  .metric-card--behind .metric-value {
    color: ${(props) => props.theme.text};
  }

  .metric-card--locales .metric-value {
    color: ${(props) => props.theme.text};
  }

  .metric-card--pendientes .metric-value {
    color: ${(props) => props.theme.text};
  }

  .signal-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .repo-details {
    display: flex;
    flex-direction: column;
    gap: 0;
    border-radius: ${(props) => props.theme.border.radius.md};
    overflow: hidden;
  }

  .detail-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .detail-label {
    width: 76px;
    min-width: 76px;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.12em;
    padding-top: 2px;
  }

  .detail-value {
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${(props) => props.theme.colors.text.subtext2};
  }

  .detail-path span,
  .file-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 14px;
    border-radius: ${(props) => props.theme.border.radius.md};
    border: 1px solid ${(props) => props.theme.border.border2};
    background: ${(props) => rgba(props.theme.background.mantle, 0.9)};
    color: ${(props) => props.theme.text};
    cursor: pointer;
    transition: transform 0.14s ease, border-color 0.14s ease, opacity 0.14s ease;
  }

  .action-button:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${(props) => rgba(props.theme.brand, 0.45)};
  }

  .action-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .action-button.wide {
    width: 100%;
    justify-content: flex-start;
  }

  .action-button.primary {
    background: ${(props) => props.theme.primary.solid};
    border-color: ${(props) => props.theme.primary.solid};
    color: ${(props) => props.theme.button2.color.primary.text};
  }

  .action-button.neutral {
    background: ${(props) => rgba(props.theme.background.surface0, 0.65)};
    border-color: ${(props) => props.theme.border.border2};
  }

  .action-button.warning {
    background: ${(props) => props.theme.status.warning.background};
    border-color: ${(props) => rgba(props.theme.status.warning.border, 0.5)};
    color: ${(props) => props.theme.status.warning.text};
  }

  .action-button.subtle {
    background: transparent;
    border-color: ${(props) => props.theme.border.border1};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .section-header,
  .history-title-row,
  .actions-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .file-list,
  .history-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .scroll-area {
    max-height: 26rem;
    overflow: auto;
    padding-right: 4px;
  }

  .compact-scroll {
    max-height: 18rem;
  }

  .compact-list {
    margin-top: 10px;
  }

  .history-row,
  .file-list-divided > .file-row {
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .history-row:last-child,
  .file-list-divided > .file-row:last-child {
    border-bottom: none;
  }

  .history-row {
    padding: 14px 0;
  }

  .history-title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 0.82rem;
  }

  .file-row {
    min-width: 0;
  }

  .inline-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
    justify-content: flex-start;
    padding: 8px 0;
  }

  .empty-block {
    padding: 14px;
    border-radius: ${(props) => props.theme.border.radius.md};
    background: ${(props) => rgba(props.theme.background.surface0, 0.5)};
    border: 1px solid ${(props) => props.theme.border.border1};
  }

  .tone-warning {
    border-color: ${(props) => rgba(props.theme.status.warning.border, 0.35)};
  }

  .tone-info {
    border-color: ${(props) => props.theme.border.border2};
  }

  .input-label {
    display: block;
    margin-top: 12px;
    margin-bottom: 6px;
    font-size: 0.75rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .commit-input {
    width: 100%;
    min-height: 38px;
    padding: 0 12px;
    border-radius: ${(props) => props.theme.border.radius.md};
    border: 1px solid ${(props) => props.theme.input.border};
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    outline: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  }

  .commit-input:focus {
    border-color: ${(props) => props.theme.input.focusBorder};
    box-shadow: 0 0 0 3px ${(props) => rgba(props.theme.brand, 0.15)};
  }

  @media (max-width: 900px) {
    .git-sync-actions-buttons {
      gap: 6px;
    }

    .git-sync-btn {
      min-height: 28px;
      padding: 4px 9px;
      font-size: 0.66rem;
    }
  }

  @media (max-width: 1100px) {
    .bottom-grid {
      grid-template-columns: 1fr;
    }

    .metrics-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .page-header {
      flex-direction: column;
    }

    .header-badges {
      justify-content: flex-start;
    }

    .header-actions-hint {
      text-align: left;
    }
  }
`;

export default StyledWrapper;
