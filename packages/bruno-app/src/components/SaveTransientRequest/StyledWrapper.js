import styled from 'styled-components';

const StyledWrapper = styled.div`
  .save-request-form {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .form-section {
    display: flex;
    flex-direction: column;
  }

  .form-label {
    display: block;
    font-weight: 500;
    margin-bottom: 8px;
    color: ${(props) => props.theme.text};
  }

  .form-input {
    display: block;
    width: 100%;
    line-height: 1.42857143;
    padding: 0.45rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.text};
    transition: border-color ease-in-out 0.1s;

    &:focus {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
      outline: none !important;
    }
  }

  .collections-section {
    display: flex;
    flex-direction: column;
  }

  .collections-label {
    display: block;
    font-weight: 500;
    margin-bottom: 8px;
    color: ${(props) => props.theme.text};
  }

  .collection-name {
    display: flex;
    align-items: center;
    font-size: 14px;
    margin-bottom: 12px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .collection-name-clickable {
    cursor: pointer;
  }

  .collection-name-breadcrumb {
    cursor: pointer;
  }

  .collection-name-chevron {
    margin: 0 4px;
  }

  .search-container {
    margin-bottom: 12px;
  }

  .folder-list {
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};
    max-height: 256px;
    overflow-y: auto;
    background-color: ${(props) => props.theme.modal.body.bg};
    padding: 8px 8px;
  }

  .folder-list-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
    list-style: none;
    padding: 0;
    margin: 0;
    border-radius: ${(props) => props.theme.border.radius.sm};
  }

  .folder-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    cursor: pointer;
    transition: background-color 0.15s ease;
    color: ${(props) => props.theme.text};
    border-radius: ${(props) => props.theme.border.radius.sm};
    user-select: none;
    &:hover {
      background-color: ${(props) => props.theme.plainGrid.hoverBg};
    }

    &.selected {
      background-color: ${(props) => props.theme.plainGrid.hoverBg};
    }
  }

  .folder-item-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .folder-item-name {
    color: ${(props) => props.theme.text};
  }

  .folder-empty-state {
    padding: 16px 12px;
    text-align: center;
    font-size: 14px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .custom-modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0px;
    background-color: ${(props) => props.theme.modal.body.bg};
    border-top: 1px solid ${(props) => props.theme.border.border0};
    border-bottom-left-radius: ${(props) => props.theme.border.radius.base};
    border-bottom-right-radius: ${(props) => props.theme.border.radius.base};
  }

  .footer-left {
    display: flex;
    align-items: center;
  }

  .footer-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .text-muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .new-folder-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid ${(props) => props.theme.border.border1};
    margin-top: 4px;
    padding-top: 12px;
  }

  .new-folder-content {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .new-folder-inputs {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .new-folder-name-input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .new-folder-name-label {
    font-size: 12px;
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .new-folder-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .new-folder-input {
    flex: 1;
    padding: 6px 8px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.text};
    font-size: 14px;
    transition: border-color ease-in-out 0.1s;

    &:focus {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
      outline: none !important;
    }

    &::placeholder {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .new-folder-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .new-folder-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    border-radius: ${(props) => props.theme.border.radius.sm};
    transition: all 0.15s ease;

    &:hover {
      background-color: ${(props) => props.theme.plainGrid.hoverBg};
      color: ${(props) => props.theme.text};
    }

    &:active {
      opacity: 0.7;
    }
  }

  .new-folder-filesystem-wrapper {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 4px;
  }

  .new-folder-filesystem-label {
    font-size: 12px;
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .new-folder-toggle-filesystem-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    margin-top: 4px;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    border-radius: ${(props) => props.theme.border.radius.sm};
    font-size: 12px;
    transition: all 0.15s ease;
    align-self: flex-start;

    &:hover {
      background-color: ${(props) => props.theme.plainGrid.hoverBg};
      color: ${(props) => props.theme.text};
    }
  }

  .new-folder-error {
    color: ${(props) => props.theme.colors.danger};
    font-size: 12px;
    margin-top: 4px;
  }
`;

export default StyledWrapper;
