import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tl-row-wrap {
    min-width: 0;
  }

  .tl-row {
    display: grid;
    /* Badge and time use fixed widths so they line up across rows. */
    grid-template-columns: 14px auto 50px minmax(0, 1fr) 96px 100px;
    column-gap: 10px;
    align-items: center;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.08s ease;
    min-width: 0;
    padding: 7px 4px;
    border-top: 1px solid ${(props) => props.theme.border.border1};
  }
  .tl-row:hover {
    background: ${(props) => props.theme.bg2 || 'rgba(255, 255, 255, 0.04)'};
  }
  .tl-row.is-expanded {
    background: ${(props) => props.theme.bg2 || 'rgba(255, 255, 255, 0.06)'};
  }
  .tl-row-wrap:first-child .tl-row {
    border-top: none;
  }

  .tl-col-chev {
    color: ${(props) => props.theme.colors.text.muted};
    opacity: 0.7;
    line-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tl-col-status,
  .tl-col-method,
  .tl-col-url,
  .tl-col-badge,
  .tl-col-time {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .tl-col-status .timeline-status {
    font-size: 11px;
  }

  .tl-col-method {
    padding-right: 14px;
  }

  .tl-col-url {
    color: ${(props) => props.theme.text};
    font-size: 13px;
  }

  .tl-col-time {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 11px;
    text-align: right;
  }

  .tl-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    letter-spacing: 0.02em;
    background: ${(props) => props.theme.bg2 || 'rgba(212, 161, 74, 0.12)'};
    color: ${(props) => props.theme.colors.text.muted};
    white-space: nowrap;
  }
  .tl-badge--main {
    background: rgba(109, 197, 120, 0.14);
    color: ${(props) => props.theme.colors.text.green};
  }
  .tl-badge--oauth2 {
    background: rgba(74, 143, 212, 0.12);
    color: ${(props) => props.theme.textLink || '#7eafdc'};
  }
  .tl-badge--scripted {
    background: rgba(212, 161, 74, 0.12);
    color: ${(props) => props.theme.colors.text.yellow || '#c8a468'};
  }
  .tl-badge--run-request {
    background: rgba(184, 127, 212, 0.14);
    color: ${(props) => props.theme.colors.text.purple || '#c79bdc'};
  }

  .tl-detail {
    border-top: 1px dashed ${(props) => props.theme.border.border1};
    margin-top: 4px;
  }

  .tl-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px 10px 28px;
  }
  .tl-header-url {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ${(props) => props.theme.font?.mono || 'var(--font-family-mono)'};
    font-size: 13px;
    color: ${(props) => props.theme.text};
  }
  .tl-header-url-method {
    font-weight: 600;
    margin-right: 6px;
    text-transform: uppercase;
  }
  .tl-header-src {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: ${(props) => props.theme.colors.text.muted};
    text-decoration: none;
    cursor: pointer;
    font-family: ${(props) => props.theme.font?.mono || 'var(--font-family-mono)'};
    font-size: 11px;
    max-width: 260px;
    overflow: hidden;
  }
  .tl-header-src:hover {
    color: ${(props) => props.theme.text};
  }
  .tl-header-src-file {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tl-header-src-icon {
    color: ${(props) => props.theme.textLink};
    flex-shrink: 0;
  }

  /* Outer padding compensates for the first tab's 14px left padding so the
     tab text lines up with the URL above. */
  .tl-tabs {
    display: flex;
    align-items: center;
    padding: 0 12px 0 14px;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }
  .tl-tab {
    position: relative;
    padding: 9px 14px;
    margin-bottom: -1px;
    background: none;
    border: none;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
  }
  .tl-tab:hover {
    color: ${(props) => props.theme.text};
  }
  .tl-tab.is-active {
    color: ${(props) => props.theme.tabs.active.color};
  }
  .tl-tab.is-active::after {
    content: '';
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 0;
    height: 2px;
    background: ${(props) => props.theme.tabs.active.border};
  }

  .tl-panel {
    padding: 12px 12px 14px 28px;
  }

  .tl-response-meta {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 6px 0 4px 0;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
  }
  .tl-response-meta-status {
    font-weight: 700;
    font-size: 13px;
  }
  .tl-response-meta-item {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .tl-block {
    margin-top: 14px;
  }
  .tl-block:first-child {
    margin-top: 0;
  }
  .tl-block-h {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    margin-bottom: 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    user-select: none;
  }
  .tl-block-h:hover {
    color: ${(props) => props.theme.text};
  }
  .tl-block-chev {
    color: ${(props) => props.theme.colors.text.muted};
    line-height: 0;
    display: inline-flex;
    align-items: center;
  }
  .tl-block-count {
    color: ${(props) => props.theme.colors.text.muted};
    opacity: 0.65;
    font-weight: 500;
    font-size: 11px;
    text-transform: none;
    letter-spacing: 0;
  }

  .tl-headers-table {
    width: 100%;
    border-collapse: collapse;
    font-family: ${(props) => props.theme.font?.mono || 'var(--font-family-mono)'};
    font-size: 12px;
    table-layout: auto;
  }
  .tl-headers-table tr {
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }
  .tl-headers-table tr:last-child {
    border-bottom: none;
  }
  .tl-headers-table tr:hover {
    background: ${(props) => props.theme.bg2 || 'rgba(255, 255, 255, 0.03)'};
  }
  .tl-headers-table td {
    padding: 5px 10px 5px 0;
    vertical-align: top;
    word-break: break-all;
    border: none;
  }
  .tl-headers-table td.tl-headers-key {
    color: ${(props) => props.theme.colors.text.muted};
    width: 220px;
    min-width: 120px;
    max-width: 280px;
  }
  .tl-headers-table td.tl-headers-val {
    color: ${(props) => props.theme.text};
  }

  .tl-empty {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
    padding: 6px 0;
  }
`;

export default StyledWrapper;
