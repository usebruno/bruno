import styled, { css } from 'styled-components';
import { rgba } from 'polished';

export const StyledWrapper = styled.div`
  .modal-content {
    display: flex;
    flex-direction: column;
    height: 45vh;
    overflow: hidden;
  }

  .modal-header {
    font-weight: 600;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
  }

  .scroll-area {
    flex: 1;
    overflow-y: auto;
    padding-right: 0.25rem;
  }

  .environments-list-container {
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: ${(props) => props.theme.border.radius.base};
    display: flex;
    flex-direction: column;
    background-color: ${(props) => props.theme.background.base};
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
    color: ${(props) => props.theme.text};

    &:not(:last-child) {
      margin-bottom: 0.75rem;
    }
  }

  .warning-title {
    font-weight: 700;
  }
  
  .warning-icon {
    color: ${(props) => props.theme.colors.text.yellow};
  }

  .error-icon {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .search-block {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    flex-shrink: 0;
    gap: 1rem;
    border-bottom: 1px solid ${(props) => props.theme.border.border0};
    background: ${(props) => (props.theme.mode === 'dark' ? props.theme.background.mantle : 'transparent')};
  }

  .search-input-wrapper {
    flex: 1;
  }

  .expand-all-wrapper {
    display: flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
  }

  .expand-all-text {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
    line-height: 20px;
    letter-spacing: normal;
    min-width: 4.5rem;
  }

  .groups-scroll-area {
    overflow-y: auto;
    max-height: calc(45vh - 160px);
  }

  .group-container {
    &:not(:last-child) {
      border-bottom: 1px solid ${(props) => props.theme.border.border0};
    }
  }

  .group-header {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    background: ${(props) => (props.theme.mode === 'dark' ? props.theme.background.crust : props.theme.background.mantle)};
    max-height: 2.5rem;
  }

  .group-title-wrapper {
    display: flex;
    align-items: center;
    cursor: pointer;
    flex: 1;
    user-select: none;
  }

  .group-title {
    font-weight: 600;
    margin-left: 0.5rem;
  }

  .group-checkbox {
    margin-left: 0.5rem;
    margin-right: 0.25rem;
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary.solid};
  }

  .chevron-icon {
    color: ${(props) => props.theme.colors.text.subtext0};
  }

  .group-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem 0;
    background: ${(props) => (props.theme.mode === 'dark' ? props.theme.background.mantle : 'transparent')};
  }

  .env-item {
    display: flex;
    align-items: flex-start;
    padding-left: 0.625rem;
  }

  .env-import-invalid-item {
    padding-left: 2.125rem;
  }

  .env-item-label {
    display: flex;
    flex: 1;
    align-items: flex-start;
    cursor: pointer;
    min-width: 0;
    margin-left: 1.375rem;
  }

  .env-item-checkbox {
    margin-right: 0.75rem;
    margin-top: 0.25rem;
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary.solid};
  }

  .env-item-content {
    flex: 1;
    min-width: 0;
  }

  .env-name {
    color: ${(props) => props.theme.text};
    font-family: Inter, sans-serif;
    font-weight: 500;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.5;
  }

  .env-filepath {
    font-weight: 500;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.subtext1};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 0.125rem;
  }

  .env-error {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.danger};
    margin-top: 0.125rem;
  }

  .env-actions {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    padding: 0.125rem;
    margin-right: 0.5rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    background: ${(props) => (props.theme.mode === 'dark' ? props.theme.background.crust : props.theme.background.mantle)};
    margin-left: 0.5rem;
    flex-shrink: 0;
  }

  .empty-state {
    padding-left: 1.5rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    font-size: 0.875rem;
    color: ${(props) => props.theme.colors.text.subtext0};
  }

  .footer-left-content {
    font-size: 13px;
    line-height: 20px;
    letter-spacing: normal;
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.subtext0};
  }
`;

export const DropdownTrigger = styled.div`
  display: flex;
  align-items: center;
  font-size: ${(props) => props.theme.font.size.sm};
  background-color: ${(props) => props.theme.dropdown.bg};
  border: 1px solid ${(props) => props.theme.dropdown.separator};
  border-radius: ${(props) => props.theme.border.radius.base};
  padding: 0.25rem 0.5rem;
  margin-left: 0.5rem;
  cursor: pointer;
  color: ${(props) => props.theme.dropdown.color};
  .icon-chevron {
    color: ${(props) => props.theme.dropdown.iconColor};
    margin-left: 0.25rem;
  }

  &:hover {
    background-color: ${(props) => props.theme.dropdown.hoverBg};
  }

  &:focus {
    outline: none;
  }
`;

export const ResolutionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border-radius: ${(props) => props.theme.border.radius.sm};
  border: 1.24px solid transparent;

  ${(props) =>
    props.$selected
      ? css`
          background: ${props.theme.background.base};
          border-color: ${props.theme.border.border0};
          color: ${props.theme.brand};
        `
      : css`
          background: transparent;
          color: ${props.theme.colors.text.subtext0};
        `}
`;
