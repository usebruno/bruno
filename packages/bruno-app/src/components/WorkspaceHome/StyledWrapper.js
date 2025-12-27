import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .workspace-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    position: relative;
  }

  .workspace-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: ${(props) => props.theme.text};
  }

  .workspace-rename-container {
    height: 26px;
    display: flex;
    align-items: center;
    background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    gap: 6px;
    border-radius: 4px;
  }

  .workspace-name-input {
    padding: 0 8px;
    font-size: 15px;
    font-weight: 600;
    border-radius: 4px;
    background: transparent;
    color: ${(props) => props.theme.text};
    outline: none;
    min-width: 180px;

    &:focus {
      outline: none;
    }
  }

  .inline-actions {
    display: flex;
    gap: 2px;
  }

  .inline-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;

    &.save {
      color: ${(props) => props.theme.colors.text.green};

      &:hover {
        background-color: ${(props) => rgba(props.theme.colors.text.green, 0.1)};
      }
    }

    &.cancel {
      color: ${(props) => props.theme.colors.text.danger};

      &:hover {
        background-color: ${(props) => rgba(props.theme.colors.text.danger, 0.1)};
      }
    }
  }

  .workspace-error {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.danger};
  }

  .workspace-menu-dropdown {
    min-width: 140px;
  }

  .tab-content {
    flex: 1;
    overflow: hidden;
  }
`;

export default StyledWrapper;
