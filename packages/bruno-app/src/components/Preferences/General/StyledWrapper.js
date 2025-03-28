import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  .bruno-form {
    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      min-height: 40px;
      border-bottom: 1px solid ${(props) => props.theme.modal.input.border};

      &.pl-6 {
        padding-left: 1.5rem;
      }

      &:last-of-type {
        border-bottom: none;
      }
    }

    .setting-item-left {
      flex: 1;
      padding-right: 16px;

      .setting-label {
        font-size: 14px;
        color: ${(props) => props.theme.text};
      }

      .setting-description {
        font-size: 12px;
        color: ${(props) => props.theme.colors.text.muted};
        margin-top: 2px;
      }
    }

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

    button.btn-secondary {
      background: ${(props) => props.theme.button.secondary.bg};
      color: ${(props) => props.theme.button.secondary.color};
      border: 1px solid ${(props) => props.theme.button.secondary.border};
      padding: 4px 12px;
      border-radius: 4px;
    }

    /* Remove border for the last item before the save button */
    .setting-item:nth-last-child(2) {
      border-bottom: none;
    }
  }
`;

export default StyledWrapper;
