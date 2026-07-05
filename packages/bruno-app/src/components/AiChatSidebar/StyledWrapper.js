import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex-shrink: 0;
  height: 100%;

  .ai-sidebar {
    width: 420px;
    height: 100%;
    background: ${(props) => props.theme.bg};
    border-left: 1px solid ${(props) => props.theme.border.border1};
    display: flex;
    flex-direction: column;
  }

  .ai-sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .header-icon {
      color: ${(props) => props.theme.brand};
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .header-method {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;
      background: ${(props) => props.theme.background.surface0};
      display: flex;
      align-items: center;

      &.method-get { color: ${(props) => props.theme.request.methods.get}; }
      &.method-post { color: ${(props) => props.theme.request.methods.post}; }
      &.method-put { color: ${(props) => props.theme.request.methods.put}; }
      &.method-delete { color: ${(props) => props.theme.request.methods.delete}; }
      &.method-patch { color: ${(props) => props.theme.request.methods.patch}; }
      &.method-options { color: ${(props) => props.theme.request.methods.options}; }
      &.method-head { color: ${(props) => props.theme.request.methods.head}; }
      &.method-grpc { color: ${(props) => props.theme.request.grpc}; }
      &.method-ws { color: ${(props) => props.theme.request.ws}; }
      &.method-gql { color: ${(props) => props.theme.request.gql}; }
      &.method-app { color: ${(props) => props.theme.brand}; }
    }

    .header-title {
      font-size: 13px;
      color: ${(props) => props.theme.text};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
    }

    .chat-switcher-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      color: ${(props) => props.theme.colors.text.muted};
      flex-shrink: 0;

      &:hover {
        background: ${(props) => props.theme.background.surface0};
        color: ${(props) => props.theme.text};
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .history-wrap {
      position: relative;
    }

    .icon-btn {
      position: relative;
      padding: 6px;
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      color: ${(props) => props.theme.colors.text.muted};
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: ${(props) => props.theme.background.surface0};
        color: ${(props) => props.theme.text};
      }

      &.is-active {
        background: ${(props) => props.theme.background.surface0};
        color: ${(props) => props.theme.text};
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      &.close-btn:hover {
        background: ${(props) => props.theme.status.danger.background};
        color: ${(props) => props.theme.colors.text.danger};
      }

    }
  }

  .history-popover {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 20;
    width: 300px;
    max-height: 320px;
    overflow-y: auto;
    background: ${(props) => props.theme.bg};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: 8px;
    box-shadow: ${(props) => props.theme.shadow.md};
    padding: 4px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: ${(props) => props.theme.scrollbar.color};
      border-radius: 2px;
    }

    &__empty {
      padding: 16px;
      text-align: center;
      font-size: 11px;
      color: ${(props) => props.theme.colors.text.muted};
    }

    &__item {
      display: flex;
      align-items: stretch;
      gap: 2px;
      border-radius: 4px;

      &:hover {
        background: ${(props) => props.theme.background.surface0};
      }

      &.is-active {
        background: ${(props) => props.theme.background.surface0};
      }
    }

    &__title {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      padding: 6px 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      color: ${(props) => props.theme.text};
    }

    &__title-text {
      display: block;
      width: 100%;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__meta {
      font-size: 10px;
      color: ${(props) => props.theme.colors.text.muted};
    }

    &__delete {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 8px;
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      color: ${(props) => props.theme.colors.text.muted};

      &:hover {
        background: ${(props) => props.theme.status.danger.background};
        color: ${(props) => props.theme.colors.text.danger};
      }
    }
  }

  .ai-sidebar-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: ${(props) => props.theme.scrollbar.color};
      border-radius: 2px;
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 24px 16px;
    animation: fadeIn 0.3s ease;

    .empty-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: ${(props) => props.theme.brand};
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${(props) => (props.theme.mode === 'dark' ? '#000' : '#fff')};
      margin-bottom: 12px;
    }

    h3 {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 4px 0;
      color: ${(props) => props.theme.text};
    }

    > p {
      color: ${(props) => props.theme.colors.text.muted};
      font-size: 12px;
      margin: 0 0 16px 0;
      line-height: 1.4;
    }

    .suggestions-title {
      font-size: 11px;
      color: ${(props) => props.theme.colors.text.muted};
      margin: 0 0 8px 0;
      font-weight: 500;
    }

    .suggestion-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
    }

    .suggestion-chip {
      padding: 5px 10px;
      background: ${(props) => props.theme.background.surface0};
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: 12px;
      font-size: 11px;
      color: ${(props) => props.theme.text};
      cursor: pointer;

      &:hover {
        border-color: ${(props) => props.theme.brand};
        color: ${(props) => props.theme.brand};
      }
    }
  }

  .message {
    animation: slideIn 0.25s ease;

    &.user .message-content {
      background: ${(props) => props.theme.background.mantle};
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      line-height: 1.4;
      color: ${(props) => props.theme.text};
    }

    &.assistant .message-content {
      color: ${(props) => props.theme.text};
    }
  }

  .message-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    margin-bottom: 6px;
    color: ${(props) => props.theme.colors.text.muted};

    &__spinner {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid ${(props) => props.theme.brand};
      border-top-color: transparent;
      animation: spin 0.9s linear infinite;
      flex-shrink: 0;
    }
  }

  .tool-activity-log {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin: 6px 0;
    padding: 4px 0;

    &.completed {
      opacity: 0.7;
    }
  }

  .tool-activity-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
    line-height: 1.6;
    padding: 1px 0;

    .tool-activity-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    &.done .tool-activity-indicator {
      color: ${(props) => props.theme.colors.text.green};
    }

    &.active {
      color: ${(props) => props.theme.text};

      .tool-activity-indicator {
        color: ${(props) => props.theme.brand};
      }
    }

    .tool-activity-spinner {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1.5px solid ${(props) => props.theme.brand};
      border-top-color: transparent;
      animation: spin 0.9s linear infinite;
      display: block;
    }
  }

  .message-cancelled {
    margin-top: 8px;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .assistant-code-block {
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: 8px;
    background: ${(props) => props.theme.codemirror.bg};
    overflow: hidden;
    margin: 8px 0;

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      border-bottom: 1px solid ${(props) => props.theme.border.border1};
    }

    &__meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      color: ${(props) => props.theme.colors.text.muted};
    }

    &__lang {
      text-transform: lowercase;
    }

    &__spinner {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid ${(props) => props.theme.brand};
      border-top-color: transparent;
      animation: spin 0.9s linear infinite;
      flex-shrink: 0;
    }

    &__btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 6px;
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: 4px;
      background: ${(props) => props.theme.background.mantle};
      font-size: 10px;
      font-weight: 500;
      color: ${(props) => props.theme.text};
      cursor: pointer;

      &:hover {
        border-color: ${(props) => props.theme.brand};
        color: ${(props) => props.theme.brand};
      }
    }

    &__body {
      margin: 0;
      padding: 10px 12px;
      overflow: auto;
      max-height: 240px;
      font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: 11px;
      line-height: 1.5;
      white-space: pre;
    }

    .cursor {
      display: inline-block;
      animation: blink 1s infinite;
      color: ${(props) => props.theme.brand};
      margin-left: 1px;
    }
  }

  .prose.markdown-body {
    font-size: 13px;
    line-height: 1.5;

    .cursor {
      display: inline-block;
      animation: blink 1s infinite;
      color: ${(props) => props.theme.brand};
      margin-left: 1px;
    }

    p {
      margin: 0 0 8px 0;
      font-size: 13px;
      &:last-child { margin-bottom: 0; }
    }

    h1, h2, h3, h4, h5, h6 {
      margin: 10px 0 6px 0;
      font-weight: 600;
      line-height: 1.3;
      &:first-child { margin-top: 0; }
    }

    h1 { font-size: 1.3em; }
    h2 { font-size: 1.2em; }
    h3 { font-size: 1.1em; }

    ul, ol {
      margin: 6px 0;
      padding-left: 16px;
    }

    li {
      margin: 4px 0;
      font-size: 13px;
    }

    code {
      background: ${(props) => props.theme.codemirror.bg};
      padding: 2px 5px;
      border-radius: 4px;
      font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }

    pre, .code-block {
      background: ${(props) => props.theme.codemirror.bg};
      padding: 10px 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 8px 0;
      border: 1px solid ${(props) => props.theme.border.border1};

      code {
        background: none;
        padding: 0;
        font-size: 11px;
        line-height: 1.5;
      }
    }

    blockquote {
      border-left: 2px solid ${(props) => props.theme.brand};
      margin: 8px 0;
      padding: 4px 0 4px 10px;
      color: ${(props) => props.theme.colors.text.muted};
      background: ${(props) => props.theme.background.surface0};
      border-radius: 0 4px 4px 0;
    }

    a {
      color: ${(props) => props.theme.textLink};
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    strong { font-weight: 600; }
    em { font-style: italic; }

    hr {
      border: none;
      border-top: 1px solid ${(props) => props.theme.border.border1};
      margin: 10px 0;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 8px 0;
      font-size: 12px;
    }

    th, td {
      border: 1px solid ${(props) => props.theme.border.border1};
      padding: 6px 8px;
      text-align: left;
    }

    th {
      background: ${(props) => props.theme.codemirror.bg};
      font-weight: 600;
    }
  }

  .processing-indicator {
    padding: 8px 10px;
    background: ${(props) => props.theme.background.surface0};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: 8px;
    animation: slideIn 0.2s ease;

    .processing-content {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .processing-icon {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      background: ${(props) => props.theme.background.surface1};
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${(props) => props.theme.brand};
    }

    .processing-label {
      font-size: 12px;
      font-weight: 500;
      color: ${(props) => props.theme.text};
    }

    .processing-dots {
      display: flex;
      gap: 3px;
      margin-left: 2px;

      span {
        width: 3px;
        height: 3px;
        background: ${(props) => props.theme.brand};
        border-radius: 50%;
        animation: dotBounce 1.4s infinite ease-in-out both;

        &:nth-child(1) { animation-delay: -0.32s; }
        &:nth-child(2) { animation-delay: -0.16s; }
      }
    }

    .processing-bar {
      height: 2px;
      background: ${(props) => props.theme.border.border1};
      border-radius: 1px;
      overflow: hidden;

      .processing-bar-fill {
        height: 100%;
        width: 30%;
        background: ${(props) => props.theme.brand};
        border-radius: 1px;
        animation: progressSlide 1.5s infinite ease-in-out;
      }
    }
  }

  .error-message {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px;
    background: ${(props) => props.theme.status.danger.background};
    border: 1px solid ${(props) => props.theme.status.danger.border};
    border-radius: 6px;

    .error-icon {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${(props) => props.theme.colors.text.danger};
      color: ${(props) => (props.theme.mode === 'dark' ? '#000' : '#fff')};
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 11px;
      flex-shrink: 0;
    }

    .error-text {
      color: ${(props) => props.theme.colors.text.danger};
      font-size: 12px;
      line-height: 1.4;
    }
  }

  .ai-sidebar-input {
    padding: 12px;
    border-top: 1px solid ${(props) => props.theme.border.border1};

    .no-models-warning {
      padding: 10px 12px;
      font-size: 12px;
      color: ${(props) => props.theme.colors.text.muted};
      background: ${(props) => props.theme.input.bg};
      border: 1px dashed ${(props) => props.theme.border.border1};
      border-radius: 6px;
      text-align: center;
      line-height: 1.4;
    }

    .input-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px;
      background: ${(props) => props.theme.bg};
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: 8px;

      &:focus-within {
        border-color: ${(props) => props.theme.brand};
      }
    }

    textarea {
      width: 100%;
      padding: 0;
      margin: 4px 0;
      border: none;
      background: transparent;
      color: ${(props) => props.theme.text};
      font-size: 13px;
      font-family: inherit;
      line-height: 1.4;
      resize: none;
      outline: none;
      max-height: 100px;

      &::placeholder {
        color: ${(props) => props.theme.colors.text.muted};
      }

      &:disabled {
        opacity: 0.6;
      }
    }

    .input-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .model-selector {
      position: relative;
    }

    .model-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 6px 4px 8px;
      background: transparent;
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: ${(props) => props.theme.border.radius.base};
      font-size: 11px;
      font-weight: 500;
      color: ${(props) => props.theme.text};
      cursor: pointer;

      svg:first-child {
        color: ${(props) => props.theme.brand};
      }

      &:hover {
        border-color: ${(props) => props.theme.border.border2};
      }
    }

    .send-btn, .stop-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
    }

    .send-btn {
      background: ${(props) => props.theme.brand};
      color: ${(props) => (props.theme.mode === 'dark' ? '#000' : '#fff')};

      &:hover {
        opacity: 0.9;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .stop-btn {
      background: ${(props) => props.theme.colors.text.danger};
      color: ${(props) => (props.theme.mode === 'dark' ? '#000' : '#fff')};

      &:hover {
        opacity: 0.9;
      }
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  @keyframes dotBounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }

  @keyframes progressSlide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

export default StyledWrapper;
