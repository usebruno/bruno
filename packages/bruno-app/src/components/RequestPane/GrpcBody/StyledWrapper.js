import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;

  .messages-container {
    flex: 1;
    display: flex;
    flex-direction: column;

    &.single {
      height: 100%;
    }

    &.multi {
      overflow-y: auto;
      padding-bottom: 48px;
    }
  }

  .message-container {
    display: flex;
    flex-direction: column;

    &.single {
      height: 100%;

      .editor-container {
        height: calc(100% - 32px);
      }
    }

    &:not(.single) {
      min-height: 240px;
      margin-bottom: 8px;

      &.last {
        margin-bottom: 0;
      }
    }
  }

  .message-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    padding: 4px 0px;
    padding-top: 0px;
    height: 32px;
    flex-shrink: 0;

    .message-label {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.subtext1};
      margin-right: auto;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      color: ${(props) => props.theme.colors.text.muted};
      transition: all 0.15s ease;

      &:hover {
        background-color: ${(props) => props.theme.dropdown.hoverBg};
        color: ${(props) => props.theme.text};
      }

      &.disabled {
        opacity: 0.4;
        cursor: not-allowed;

        &:hover {
          background-color: transparent;
          color: ${(props) => props.theme.colors.text.muted};
        }
      }

      &.delete:hover {
        color: ${(props) => props.theme.colors.text.danger};
      }
    }
  }

  .editor-container {
    flex: 1;
    min-height: 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;

    p {
      color: ${(props) => props.theme.colors.text.muted};
      font-size: 13px;
    }
  }

  .add-message-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px;
    background: ${(props) => props.theme.bg};
  }
`;

export default Wrapper;
