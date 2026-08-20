import styled from 'styled-components';
import { rgba } from 'polished';

export const StyledWrapper = styled.div`
  /* Upload Step */
  .upload-container {
    padding: 0.5rem 0;
  }

  .upload-dropzone {
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
    width: 100%;
    border-radius: ${(props) => props.theme.border.radius.lg || '0.5rem'};
    border: 2px dashed ${(props) => props.theme.border.border0};
    padding: 3rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    background-color: transparent;

    &:hover {
      border-color: ${(props) => props.theme.colors.text.subtext0};
    }
    
    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px ${(props) => props.theme.brand}, 0 0 0 4px transparent;
    }

    &.is-drag-over {
      border-color: ${(props) => props.theme.colors.text.yellow};
      background-color: ${(props) => props.theme.colors.bg.yellow};
    }
  }

  .upload-dropzone-icon {
    color: ${(props) => props.theme.colors.text.base};
  }

  .upload-dropzone-title {
    margin-top: 0.5rem;
    display: block;
    font-weight: 500;
  }

  .upload-dropzone-subtitle {
    margin-top: 0.25rem;
    display: block;
    font-size: 0.75rem;
    color: ${(props) => props.theme.colors.text.subtext0};
  }

  /* Review Step */
  .modal-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 60vh;
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
    color: ${(props) => props.theme.colors.text.base};
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
    color: ${(props) => props.theme.colors.text.base};
    margin-bottom: 0.5rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .warning-title {
    font-weight: 700;
  }
  
  .warning-icon {
    color: ${(props) => props.theme.colors.text.yellow};
  }

  .error-icon {
    color: #CE4F3B
  }

  .search-block {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    flex-shrink: 0;
    gap: 1rem;
    border-bottom: 1px solid ${(props) => props.theme.border.border0};
    background-color: ${(props) => props.theme.background.subtle};
  }

  .search-input-wrapper {
    flex: 1;
  }

  .select-all-wrapper {
    display: flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
  }

  .select-all-checkbox {
    margin-right: 0.5rem;
    cursor: pointer;
    background: transparent;
  }

  .select-all-text {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
    line-height: 20px;
    letter-spacing: 0%;
  }

  .group-container {
    &.has-border-bottom {
      border-bottom: 1px solid ${(props) => props.theme.border.border0};
    }
  }

  .group-header {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    background: ${(props) => props.theme.background.mantle};
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

  .group-list {
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .env-item {
    display: flex;
    align-items: flex-start;
    padding-left: 1.5rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .env-item-label {
    display: flex;
    flex: 1;
    align-items: flex-start;
    cursor: pointer;
    min-width: 0;
  }

  .env-item-checkbox {
    margin-right: 0.75rem;
    margin-top: 0.25rem;
    cursor: pointer;
    background: transparent;
  }

  .env-item-content {
    flex: 1;
    min-width: 0;
  }

  .env-name {
    color: ${(props) => props.theme.colors.text.base};
    font-family: Inter;
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
    color: #CE4F3B;
    margin-top: 0.125rem;
  }

  .env-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
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
      ? `
    background: ${props.theme.background.base};
    border-color: ${props.theme.border.border0};
    color: ${props.theme.brand};
  `
      : `
    background: transparent;
    color: ${props.theme.colors.text.subtext0};
  `}
`;
