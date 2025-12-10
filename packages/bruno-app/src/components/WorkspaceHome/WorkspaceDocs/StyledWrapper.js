import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  .docs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid ${(props) => props.theme.workspace.border};
  }

  .docs-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }

  .edit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .docs-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .editor-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 10px;
  }

  .save-btn {
    padding: 6px 14px;
    background: ${(props) => props.theme.button.secondary.bg};
    color: ${(props) => props.theme.button.secondary.color};
    border: 1px solid ${(props) => props.theme.button.secondary.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: ${(props) => props.theme.button.secondary.hoverBorder};
    }
  }

  .docs-markdown {
    height: 100%;
    overflow-y: auto;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 32px 16px;
    height: 100%;
  }

  .empty-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: 8px;
    background: ${(props) => props.theme.workspace.card.bg};
    border: 1px solid ${(props) => props.theme.workspace.border};
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 2px;
    line-height: 1.4;
  }

  .empty-subtext {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 8px;
  }

  .suggestions-list {
    list-style: none;
    padding: 0;
    margin: 0 0 20px 0;
    text-align: center;

    li {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.muted};
      padding: 2px 0;

      &::before {
        content: '\\2022';
        color: ${(props) => props.theme.workspace.accent};
        margin-right: 6px;
      }
    }
  }

  .add-docs-btn {
    padding: 8px 16px;
    background: transparent;
    color: ${(props) => props.theme.workspace.accent};
    border: 1px solid ${(props) => props.theme.workspace.accent};
    border-radius: ${(props) => props.theme.border.radius.base};
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.workspace.accent}14;
    }
  }
`;

export default StyledWrapper;
