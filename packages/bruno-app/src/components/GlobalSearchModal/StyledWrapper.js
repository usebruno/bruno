import styled from 'styled-components';

const StyledWrapper = styled.div`
  /* Screen reader only content */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .command-k-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    z-index: 20;
    background-color: transparent;
    &:before {
      content: '';
      height: 100%;
      width: 100%;
      left: 0;
      opacity: ${(props) => props.theme.modal.backdrop.opacity};
      top: 0;
      background: black;
      position: fixed;
    }
    animation: fade-in 0.1s forwards cubic-bezier(0.19, 1, 0.22, 1);
  }
  .command-k-modal {
    background: ${(props) => props.theme.modal.body.bg};
    border: 1px solid ${(props) => props.theme.modal.input.border};
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    width: 90%;
    max-width: 600px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    margin: 80px auto;
    animation: fade-and-slide-in-from-top 0.3s forwards cubic-bezier(0.19, 1, 0.22, 1);
    will-change: opacity, transform;
  }
  .command-k-header {
    padding: 12px;
    border-bottom: 1px solid ${(props) => props.theme.modal.input.border};
    background: ${(props) => props.theme.modal.title.bg};
  }
  .search-input-container {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 12px;
    border: 1px solid ${(props) => props.theme.modal.input.border};
    border-radius: 6px;
    background: ${(props) => props.theme.modal.input.bg};
    transition: all 0.2s ease;
    &:focus-within {
      border-color: ${(props) => props.theme.colors.text.muted};
      box-shadow: 0 0 0 1px ${(props) => props.theme.colors.text.muted}40;
    }
    .search-icon {
      color: ${(props) => props.theme.colors.text.muted};
      opacity: 0.8;
      margin-right: 8px;
      flex-shrink: 0;
    }
    .clear-button {
      background: transparent;
      border: none;
      padding: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${(props) => props.theme.colors.text.muted};
      opacity: 0.8;
      margin-left: 8px;
      border-radius: 4px;
      flex-shrink: 0;
      &:hover {
        background: ${(props) => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
      }
    }
  }
  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: ${(props) => props.theme.text};
    font-size: 13px;
    width: 100%;
    padding: 0;
    &::placeholder {
      color: ${(props) => props.theme.colors.text.muted};
      opacity: 0.7;
    }
  }
  .command-k-results {
    flex: 1;
    overflow-y: auto;
    max-height: 400px;
    background: ${(props) => props.theme.modal.body.bg};
    scrollbar-width: thin;
    padding: 4px;
    scroll-behavior: smooth;
    /* Webkit scrollbar styling */
    &::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: ${(props) => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};
      border-radius: 4px;
      
      &:hover {
        background: ${(props) => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'};
      }
    }
  }
  .result-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    gap: 8px;
    cursor: pointer;
    border-left: 2px solid transparent;
    &:hover {
      background: ${(props) => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
    }
    &.selected {
      background: ${(props) => `${props.theme.colors.text.yellow}15`};
      border-left: 2px solid ${(props) => props.theme.colors.text.yellow};
    }
  }
  .result-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.muted};
    opacity: 0.8;
  }
  .result-content {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .result-info {
    flex: 1;
    min-width: 0;
    margin-right: 8px;
  }
  .result-badges {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .result-name {
    font-size: 13px;
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${(props) => props.theme.text};
    letter-spacing: 0.2px;
  }
  .result-path {
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.1px;
  }
  .method-badge {
    font-size: 11px;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
    min-width: 55px;
    text-align: center;
    &.get {
      color: #2ecc71;
      background: rgba(46, 204, 113, 0.1);
    }
    &.post {
      color: #3498db;
      background: rgba(52, 152, 219, 0.1);
    }
    &.put {
      color: #e67e22;
      background: rgba(230, 126, 34, 0.1);
    }
    &.delete {
      color: #e74c3c;
      background: rgba(231, 76, 60, 0.1);
    }
    &.patch {
      color: #9b59b6;
      background: rgba(155, 89, 182, 0.1);
    }
    &.head {
      color: #2980b9;
      background: rgba(41, 128, 185, 0.1);
    }
    &.options {
      color: #f1c40f;
      background: rgba(241, 196, 15, 0.1);
    }
    &.unary {
      color: #27ae60;
      background: rgba(39, 174, 96, 0.12);
      font-weight: 600;
    }
    &.client-streaming {
      color: #2980b9;
      background: rgba(41, 128, 185, 0.12);
      font-weight: 600;
    }
    &.server-streaming {
      color: #f39c12;
      background: rgba(243, 156, 18, 0.12);
      font-weight: 600;
    }
    &.bidirectional-streaming,
    &.bidi-streaming {
      color: #8e44ad;
      background: rgba(142, 68, 173, 0.12);
      font-weight: 600;
    }
  }
  .result-type {
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
    padding: 2px 6px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    background: ${(props) => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'};
    opacity: 0.8;
    flex-shrink: 0;
  }
  .result-item[data-type="documentation"] {
    .result-icon {
      color: ${(props) => props.theme.colors.text.muted};
      opacity: 0.8;
    }
    .result-path {
      font-size: 12px;
      color: ${(props) => props.theme.colors.text.muted};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: 0.1px;
      opacity: 0.8;
    }
    &:hover:not(.selected) {
      background: ${(props) => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
    }
  }
  .no-results,
  .empty-state {
    padding: 24px 16px;
    text-align: center;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 13px;
  }
  .command-k-footer {
    padding: 8px 12px;
    border-top: 1px solid ${(props) => props.theme.modal.input.border};
    background: ${(props) => props.theme.colors.surface};
  }
  .keyboard-hints {
    display: flex;
    justify-content: center;
    gap: 24px;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
    letter-spacing: 0.2px;
    span {
      display: flex;
      align-items: center;
      gap: 6px;
      .hint-icon {
        color: ${(props) => props.theme.colors.text.muted};
        opacity: 0.8;
      }
      .hint-icon + .hint-icon {
        margin-left: -8px;
      }
      .keycap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 2px 6px;
        border: 1px solid ${(props) => props.theme.modal.input.border};
        border-radius: 4px;
        background: ${(props) =>
          props.theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
        font-size: 11px;
        font-weight: 500;
        font-family: inherit;
        line-height: 1;
        color: ${(props) => props.theme.text};
      }
    }
  }
  .highlight {
    background: ${(props) => `${props.theme.colors.text.yellow}30`};
    border-radius: 2px;
    padding: 0 2px;
    margin: 0 -1px;
    font-weight: 500;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes fade-and-slide-in-from-top {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export default StyledWrapper; 