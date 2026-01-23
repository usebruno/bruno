import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  width: ${(props) => props.$width || 360}px;
  min-width: 300px;
  max-width: 700px;
  height: 100%;
  background: ${(props) => props.theme.sidebar.bg};
  border-left: 1px solid ${(props) => props.theme.sidebar.dragbar.border};
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;

  .resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    cursor: ew-resize;
    background: transparent;
    transition: background 0.15s ease;
    z-index: 11;

    &:hover,
    &.resizing {
      background: ${(props) => props.theme.brand};
    }
  }

  .ai-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px;
    border-bottom: 1px solid ${(props) => props.theme.sidebar.dragbar.border};
    flex-shrink: 0;

    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
      color: ${(props) => props.theme.colors.text.primary};

      .header-title {
        font-weight: 500;
        font-size: ${(props) => props.theme.font.size.xs};
      }
    }

    .header-actions {
      display: flex;
      gap: 2px;
    }

    .header-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      color: ${(props) => props.theme.colors.text.muted};
      padding: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: ${(props) => props.theme.border.radius.sm};
      transition: all 0.15s ease;

      &:hover {
        color: ${(props) => props.theme.colors.text.primary};
        background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      }

      &.active {
        color: ${(props) => props.theme.brand};
        background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      }
    }
  }

  .ai-panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: ${(props) => props.theme.scrollbar.color};
      border-radius: 2px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 16px;

      .empty-icon {
        color: ${(props) => props.theme.colors.text.muted};
        margin-bottom: 8px;
        opacity: 0.4;
      }

      .empty-title {
        font-size: ${(props) => props.theme.font.size.sm};
        font-weight: 500;
        color: ${(props) => props.theme.colors.text.primary};
        margin-bottom: 4px;
      }

      .empty-text {
        font-size: ${(props) => props.theme.font.size.xs};
        color: ${(props) => props.theme.colors.text.muted};
        line-height: 1.4;
      }
    }

    .welcome-state {
      display: flex;
      flex-direction: column;

      .welcome-text {
        font-size: ${(props) => props.theme.font.size.xs};
        color: ${(props) => props.theme.colors.text.muted};
        line-height: 1.4;
        margin-bottom: 10px;
      }

      .suggestions {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .suggestion-chip button {
          justify-content: flex-start;
          font-size: ${(props) => props.theme.font.size.xs};
          padding: 6px 10px;
          border: 1px solid ${(props) => props.theme.sidebar.dragbar.border};

          &:hover {
            border-color: ${(props) => props.theme.brand};
          }
        }
      }
    }

    .generating-state {
      padding: 8px 10px;
      background: ${(props) => props.theme.sidebar.collection.item.bg};
      border-radius: ${(props) => props.theme.border.radius.sm};

      .generating-title {
        font-size: 13px;
        font-weight: 500;
        color: ${(props) => props.theme.colors.text.muted};
        animation: pulse 1.5s ease-in-out infinite;
      }

      .streamed-content {
        font-size: 13px;
        line-height: 1.6;
        color: ${(props) => props.theme.colors.text.primary};
        white-space: pre-wrap;
        word-break: break-word;

        &::after {
          content: '|';
          animation: blink 0.8s ease-in-out infinite;
          color: ${(props) => props.theme.brand};
          margin-left: 2px;
        }
      }
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .review-state {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .review-header {
        display: flex;
        align-items: center;
        gap: 5px;
        font-weight: 500;
        font-size: ${(props) => props.theme.font.size.xs};
        color: ${(props) => props.theme.colors.text.primary};
      }

      .review-actions {
        display: flex;
        gap: 6px;

        > div {
          flex: 1;
        }

        button {
          padding: 6px 10px;
          font-size: ${(props) => props.theme.font.size.xs};
        }
      }
    }
  }

  .ai-panel-input {
    flex-shrink: 0;
    padding: 0;
    border-top: 1px solid ${(props) => props.theme.sidebar.dragbar.border};

    .file-selector-panel {
      padding: 8px;
      border-bottom: 1px solid ${(props) => props.theme.sidebar.dragbar.border};
      max-height: 240px;
      overflow-y: auto;
      background: ${(props) => props.theme.sidebar.bg};

      &::-webkit-scrollbar {
        width: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: ${(props) => props.theme.scrollbar.color};
        border-radius: 2px;
      }
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 10px;
    }

    .input-footer {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .selected-files-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .selected-files-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
      flex: 1;

      .file-chip {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 1px 4px;
        background: transparent;
        border-radius: 3px;
        font-size: 9px;
        border: 1px solid ${(props) => props.theme.sidebar.dragbar.border};
        transition: all 0.15s ease;

        &:hover {
          border-color: ${(props) => props.theme.brand};
        }

        .method {
          font-weight: 700;
          text-transform: uppercase;
          font-size: 7px;
          letter-spacing: 0.2px;

          &.get { color: ${(props) => props.theme.request.methods.get}; }
          &.post { color: ${(props) => props.theme.request.methods.post}; }
          &.put { color: ${(props) => props.theme.request.methods.put}; }
          &.delete { color: ${(props) => props.theme.request.methods.delete}; }
          &.patch { color: ${(props) => props.theme.request.methods.patch}; }
        }

        .name {
          color: ${(props) => props.theme.colors.text.muted};
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .remove-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          margin-left: 1px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: ${(props) => props.theme.colors.text.muted};
          opacity: 0.6;
          transition: all 0.15s ease;

          &:hover {
            color: ${(props) => props.theme.colors.text.danger};
            opacity: 1;
          }
        }
      }
    }

    .input-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      background: ${(props) => props.theme.sidebar.collection.item.bg};
      border-radius: ${(props) => props.theme.border.radius.sm};
      padding: 6px 8px;
      border: 1px solid ${(props) => props.theme.sidebar.dragbar.border};
      transition: all 0.15s ease;

      &:focus-within {
        border-color: ${(props) => props.theme.brand};
      }

      .attachment-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        cursor: pointer;
        color: ${(props) => props.theme.colors.text.muted};
        padding: 2px;
        border-radius: ${(props) => props.theme.border.radius.sm};
        transition: all 0.15s ease;
        flex-shrink: 0;

        &:hover {
          color: ${(props) => props.theme.brand};
        }

        &.active {
          color: ${(props) => props.theme.brand};
          transform: rotate(45deg);
        }
      }

      textarea {
        flex: 1;
        background: transparent;
        border: none;
        color: ${(props) => props.theme.colors.text.primary};
        font-size: ${(props) => props.theme.font.size.xs};
        line-height: 1.4;
        resize: none;
        min-height: 18px;
        max-height: 80px;
        outline: none;
        font-family: inherit;
        overflow-y: auto;
        padding: 1px 0;

        &::placeholder {
          color: ${(props) => props.theme.colors.text.muted};
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        &::-webkit-scrollbar {
          width: 3px;
        }

        &::-webkit-scrollbar-thumb {
          background: ${(props) => props.theme.scrollbar.color};
          border-radius: 2px;
        }
      }

      .send-btn-wrapper {
        display: flex;
        align-items: center;
        flex-shrink: 0;

        .send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${(props) => props.theme.brand};
          border: none;
          cursor: pointer;
          color: white;
          padding: 5px;
          border-radius: ${(props) => props.theme.border.radius.sm};
          transition: all 0.15s ease;

          &:hover:not(:disabled) {
            opacity: 0.9;
          }

          &:disabled {
            opacity: 0.35;
            cursor: not-allowed;
          }

          &.stop {
            background: ${(props) => props.theme.colors.text.danger};
          }
        }
      }
    }

    .input-controls {
      display: flex;
      align-items: center;
    }

    .clear-files-btn {
      font-size: 9px;
      color: ${(props) => props.theme.colors.text.muted};
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: ${(props) => props.theme.border.radius.sm};
      transition: all 0.15s ease;
      flex-shrink: 0;
      opacity: 0.7;

      &:hover {
        color: ${(props) => props.theme.colors.text.danger};
        opacity: 1;
      }
    }
  }
`;

export default StyledWrapper;
