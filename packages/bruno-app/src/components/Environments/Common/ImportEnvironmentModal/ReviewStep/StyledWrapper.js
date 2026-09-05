import styled, { css } from 'styled-components';
import { rgba } from 'polished';

export const StyledWrapper = styled.div`
  .modal-content {
    display: flex;
    flex-direction: column;
    height: 450px;
    max-height: calc(100vh - 180px);
    overflow: hidden;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .scroll-area {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .environments-list-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .warning-block {
    background-color: ${(props) => rgba(props.theme.colors.text.yellow, 0.1)};
    border-bottom: 1px solid ${(props) => props.theme.border.border0};
    color: ${(props) => props.theme.text};
    padding: 0.75rem;
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .warning-header {
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1;
    letter-spacing: normal;
    display: flex;
    align-items: center;
    gap: 6px;
    color: inherit;

    &:not(:last-child) {
      margin-bottom: 0.5rem;
    }
  }

  .warning-title {
    font-weight: 500;
  }

  .warning-icon {
    color: ${(props) => props.theme.colors.text.yellow};
  }

  .error-icon {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .search-block input {
    height: 28px;
    padding-top: 0;
    padding-bottom: 0;
  }

  .search-block {
    display: flex;
    align-items: center;
    padding: 12px 1.25rem;
    flex-shrink: 0;
    gap: 1rem;
    background: ${(props) => (props.theme.mode === 'dark' ? props.theme.background.mantle : 'transparent')};
  }

  .search-input-wrapper {
    flex: 1;
  }

  .groups-scroll-area {
    flex: 1;
    min-height: 0;
    border-top: 1px solid ${(props) => props.theme.border.border0};
    overflow-y: auto;
    scrollbar-gutter: stable;

    &::-webkit-scrollbar {
      width: 10px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: ${(props) => rgba(props.theme.colors.text.muted, 0.45)};
      border: 3px solid transparent;
      border-radius: 10px;
      background-clip: content-box;
    }

    &::-webkit-scrollbar-thumb:hover {
      background: ${(props) => rgba(props.theme.colors.text.muted, 0.7)};
      border: 3px solid transparent;
      background-clip: content-box;
    }
  }

  .group-header .group-count {
    padding: 2px 7px;
    border-radius: 20px;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .group-header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 35px;
    padding: 9px 20px 9px 14px;
    font-size: ${(props) => props.theme.font.size.sm};
    background: ${(props) => (props.theme.mode === 'dark' ? props.theme.background.surface0 : props.theme.background.mantle)};
    border-bottom: 1px solid ${(props) => props.theme.border.border0};

    &:hover {
      background: ${(props) => (props.theme.mode === 'dark' ? props.theme.background.surface1 : props.theme.background.crust)};
    }
  }

  .group-title-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    flex: 1;
    user-select: none;
  }

  .group-title {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
  }

  .group-checkbox {
    width: 13px;
    height: 13px;
    flex: none;
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary.solid};
  }

  .chevron-icon {
    width: 16px;
    height: 16px;
    flex: none;
    color: ${(props) => props.theme.colors.text.subtext0};
  }

  .blocked-icon {
    flex: none;
    color: ${(props) => props.theme.colors.text.danger};
  }

  .group-list {
    display: flex;
    flex-direction: column;
  }

  .env-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 20px 8px 38px;
    background: transparent;
    border-bottom: 1px solid ${(props) => rgba(props.theme.border.border0, 0.6)};

    &:hover {
      background: ${(props) => (props.theme.mode === 'dark' ? props.theme.background.surface0 : props.theme.background.mantle)};
    }
  }

  .env-import-invalid-item {
    padding: 8px 20px 8px 60px;
    background: transparent;
    border-bottom: 1px solid ${(props) => rgba(props.theme.border.border0, 0.6)};

    &:hover {
      background: ${(props) => (props.theme.mode === 'dark' ? props.theme.background.surface0 : props.theme.background.mantle)};
    }
  }

  .env-item-label {
    display: flex;
    flex: 1;
    align-items: center;
    cursor: pointer;
    min-width: 0;
    gap: 10px;
  }

  .env-item-checkbox {
    width: 13px;
    height: 13px;
    flex: none;
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary.solid};
  }

  .env-item-content {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }

  .env-name {
    color: ${(props) => props.theme.text};
    font-family: Inter, sans-serif;
    font-weight: 400;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.5;
  }

  .env-error {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 400;
    color: ${(props) => props.theme.colors.text.danger};
    margin-top: 2px;
  }

  .env-actions {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 2px;
    border-radius: ${(props) => props.theme.border.radius.base};
    background: ${(props) => (props.theme.mode === 'dark' ? props.theme.background.crust : props.theme.background.mantle)};
    flex-shrink: 0;
  }

  .empty-state {
    padding: 14px 20px 14px 38px;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 400;
    color: ${(props) => props.theme.colors.text.subtext0};
  }
`;

export const ImportModalHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;

  .title {
    font-size: ${(props) => props.theme.font.size.md};
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .count {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 400;
    color: ${(props) => props.theme.colors.text.subtext0};
    font-variant-numeric: tabular-nums;
  }
`;

export const ImportFooterSummary = styled.div`
  font-size: ${(props) => props.theme.font.size.sm};
  line-height: 20px;
  letter-spacing: normal;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  color: ${(props) => props.theme.colors.text.subtext0};

  .selected-count {
    color: ${(props) => props.theme.text};
    font-weight: 500;
  }
`;

export const ResolutionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 5px 9px;
  font-size: ${(props) => props.theme.font.size.xs};
  font-weight: 500;
  white-space: nowrap;
  border-radius: ${(props) => props.theme.border.radius.sm};
  border: 1.24px solid transparent;

  ${(props) =>
    props.$selected
      ? css`
          background: ${props.theme.background.base};
          border-color: ${props.theme.border.border0};
          color: ${props.theme.text};
        `
      : css`
          background: transparent;
          color: ${props.theme.colors.text.subtext0};
        `}
`;
