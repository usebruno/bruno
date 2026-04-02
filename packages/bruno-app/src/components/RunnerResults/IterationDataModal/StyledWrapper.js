import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.sm};

  .file-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => props.theme.background.surface0};
    border: 1px solid ${(props) => props.theme.border.border0};
    margin-bottom: 1.25rem;
  }

  .file-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .file-name {
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.text};
  }

  .file-meta {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .section {
    margin-bottom: 1.25rem;
  }

  .section-label {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.subtext0};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .preview-note {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .var-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .var-chip {
    display: inline-block;
    padding: 2px 8px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.background.surface1};
    border: 1px solid ${(props) => props.theme.border.border0};
    color: ${(props) => props.theme.colors.text.subtext1};
    font-family: monospace;
    font-size: 12px;
    cursor: default;
    user-select: all;
    transition: border-color 0.15s ease, color 0.15s ease;

    &:hover {
      border-color: ${(props) => props.theme.tabs.active.border};
      color: ${(props) => props.theme.tabs.active.color};
    }
  }

  .table-wrapper {
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: ${(props) => props.theme.border.radius.base};
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: ${(props) => props.theme.font.size.xs};

    th,
    td {
      padding: 0.35rem 0.75rem;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      max-width: 160px;
    }

    th {
      background-color: ${(props) => props.theme.background.mantle};
      color: ${(props) => props.theme.colors.text.subtext0};
      font-weight: 600;
      border-bottom: 1px solid ${(props) => props.theme.border.border0};
    }

    td {
      color: ${(props) => props.theme.colors.text.text};
      border-bottom: 1px solid ${(props) => props.theme.border.border0};
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background-color: ${(props) => props.theme.background.surface0};
    }

    .col-num {
      color: ${(props) => props.theme.colors.text.muted};
      font-weight: 500;
      min-width: 2rem;
      width: 2rem;
      text-align: center;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }
  }

  .more-rows {
    margin-top: 0.375rem;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    text-align: right;
  }

  .empty-warning {
    padding: 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => props.theme.background.surface0};
    color: ${(props) => props.theme.colors.text.danger};
    font-size: ${(props) => props.theme.font.size.sm};
  }
`;

export default StyledWrapper;
