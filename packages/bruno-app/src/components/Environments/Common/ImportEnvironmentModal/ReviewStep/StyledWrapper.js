import styled, { css } from 'styled-components';
import { rgba } from 'polished';

export const StyledWrapper = styled.div`
  .modal-content {
    display: flex;
    flex-direction: column;
    height: 45vh;
    overflow: hidden;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .list-title {
    font-weight: 600;
    display: flex;
    align-items: center;
    font-size: 14px;
  }

  .select-all-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    user-select: none;
  }

  .select-all-checkbox {
    margin-right: 0.5rem;
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary.solid};
    width: 16px;
    height: 16px;
  }

  .environments-list-container {
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => props.theme.background.base};
    overflow: hidden;
  }

  .scroll-area {
    flex: 1;
    overflow-y: auto;
  }

  .group-list {
    display: flex;
    flex-direction: column;
  }

  .env-item {
    display: flex;
    align-items: flex-start;
    padding: 0.75rem 1rem;
    &:not(:last-child) {
      border-bottom: 1px solid ${(props) => props.theme.border.border0};
    }
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
    accent-color: ${(props) => props.theme.primary.solid};
    width: 16px;
    height: 16px;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
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
    margin-top: 0.25rem;
  }

  .env-item-badge {
    margin-left: 1rem;
    display: flex;
    align-items: center;
  }

  .status-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .duplicate-badge {
    background-color: ${(props) => rgba(props.theme.colors.text.yellow, 0.15)};
    color: ${(props) => props.theme.colors.text.yellow};
  }

  .new-badge {
    background-color: ${(props) => rgba(props.theme.colors.text.green, 0.15)};
    color: ${(props) => props.theme.colors.text.green};
  }

  .invalid-badge {
    background-color: ${(props) => rgba(props.theme.colors.text.danger, 0.15)};
    color: ${(props) => props.theme.colors.text.danger};
  }

  .footer-left-content {
    font-size: 13px;
    line-height: 20px;
    letter-spacing: normal;
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.subtext0};
  }
`;
