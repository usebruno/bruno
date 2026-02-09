import styled from 'styled-components';

const StyledWrapper = styled.div`
  .workspace-title {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 24px;
    font-size: 15px;
    font-weight: 600;
    color: ${(props) => props.theme.text};
  }

  .workspace-name {
    font-size: 15px;
    font-weight: 600;
  }

  .workspace-rename-container {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .workspace-name-input {
    font-size: 14px;
    font-weight: 500;
    padding: 2px 6px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 3px;
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    outline: none;
    min-width: 150px;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }

  .inline-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .inline-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    background: transparent;
    color: ${(props) => props.theme.text};

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    &.save {
      color: ${(props) => props.theme.colors.text.green};
    }

    &.cancel {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .workspace-error {
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.danger};
    margin-left: 8px;
  }
`;

export default StyledWrapper;
