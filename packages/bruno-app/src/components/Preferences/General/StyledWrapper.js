import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  .bruno-form {
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 600;
      margin: 24px 0 16px;
      color: ${(props) => props.theme.text};

      &:first-child {
        margin-top: 0;
      }
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 12px 0;
      border-bottom: 1px solid ${(props) => props.theme.modal.input.border};

      &:last-of-type {
        border-bottom: none;
      }
    }

    .setting-item-left {
      flex: 1;
      padding-right: 16px;

      .setting-label {
        font-size: 14px;
        font-weight: 500;
        color: ${(props) => props.theme.text};
      }

      .setting-description {
        font-size: 12px;
        color: ${(props) => props.theme.colors.text.muted};
        margin-top: 2px;
      }
    }

    .timeout-input {
      display: flex;
      align-items: center;
      gap: 8px;

      .setting-input {
        width: 80px;
        height: 28px;
        padding: 0 8px;
        border-radius: 4px;
        border: 1px solid ${(props) => props.theme.modal.input.border};
        background: ${(props) => props.theme.modal.input.bg};
        color: ${(props) => props.theme.text};

        &:focus {
          border-color: ${(props) => props.theme.modal.input.focusBorder};
          outline: none;
        }
      }

      .unit {
        color: ${(props) => props.theme.colors.text.muted};
        font-size: 12px;
      }
    }

    .btn-secondary {
      background: ${(props) => props.theme.button.secondary.bg};
      color: ${(props) => props.theme.button.secondary.color};
      border: 1px solid ${(props) => props.theme.button.secondary.border};
      padding: 6px 16px;
      border-radius: 4px;
      font-size: 14px;
    }
  }
`;

export default StyledWrapper;
