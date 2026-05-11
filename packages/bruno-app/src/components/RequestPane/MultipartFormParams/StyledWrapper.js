import styled from 'styled-components';

const Wrapper = styled.div`
  .upload-btn,
  .clear-file-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 4px;
    transition: color 0.15s ease;
    flex: 0 0 auto;

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }

  .clear-file-btn:hover {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .file-value-cell {
    width: 100%;
    display: flex;
    align-items: center;
    min-width: 0;
    position: relative;

    .file-name {
      font-size: 12px;
      color: ${(props) => props.theme.text};
    }
  }

  .file-chips-row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .file-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid ${(props) => props.theme.input.border};
    font-size: 12px;
    line-height: 1;
    color: ${(props) => props.theme.text};
    max-width: 140px;
    min-width: 75px;
    flex: 0 1 auto;
    white-space: nowrap;
  }

  .file-chip-icon {
    flex: 0 0 auto;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .file-chip-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1 1 auto;
    min-width: 0;
  }

  .file-chip-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1px;
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 3px;
    flex: 0 0 auto;

    &:hover {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .file-more-chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 4px;
    background: transparent;
    border: none;
    font-size: 12px;
    line-height: 1;
    color: ${(props) => props.theme.primary.text};
    cursor: pointer;
    flex: 0 0 auto;
    white-space: nowrap;

    &:hover {
      color: ${(props) => props.theme.primary.text};
      opacity: 0.8;
    }
  }

  .file-summary-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid ${(props) => props.theme.input.border};
    font-size: 12px;
    line-height: 1;
    color: ${(props) => props.theme.text};
    cursor: pointer;
    flex: 0 1 auto;
    min-width: 0;
    white-space: nowrap;

    > span {
      overflow: hidden;
      text-overflow: ellipsis;
      color: ${(props) => props.theme.text};
    }

    > svg {
      color: ${(props) => props.theme.colors.text.muted};
    }

    &:hover,
    &:hover > span {
      color: ${(props) => props.theme.text};
    }

    &:hover {
      border-color: ${(props) => props.theme.colors.text.muted};
      background: ${(props) => {
        const hoverBg = props.theme.requestTabs
          && props.theme.requestTabs.icon
          && props.theme.requestTabs.icon.hoverBg;
        return hoverBg || 'rgba(255, 255, 255, 0.04)';
      }};
    }
  }

  .value-cell {
    width: 100%;

    .flex-1 {
      min-width: 0;
    }
  }
`;

export const OverflowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  max-height: 260px;
  overflow-y: auto;
  min-width: 220px;
  max-width: 360px;

  .overflow-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 8px;
    border-radius: 4px;
    background: transparent;
    font-size: 12px;
    line-height: 1.2;
    color: ${(props) => props.theme.text};

    &:hover {
      background: ${(props) => {
        const hoverBg = props.theme.requestTabs
          && props.theme.requestTabs.icon
          && props.theme.requestTabs.icon.hoverBg;
        return hoverBg || 'rgba(255, 255, 255, 0.04)';
      }};
    }
  }

  .overflow-row-icon {
    flex: 0 0 auto;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .overflow-row-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .overflow-row-remove {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 3px;
    flex: 0 0 auto;

    &:hover {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }
`;

export default Wrapper;
