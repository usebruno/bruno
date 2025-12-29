import styled from 'styled-components';
import { rgba } from 'polished';

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
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: 8px;
    box-shadow: ${(props) => props.theme.shadow.md};
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
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }
  .search-input-container {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 12px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 6px;
    transition: all 0.2s ease;
    &:focus-within {
      border: 1px solid ${(props) => props.theme.input.focusBorder};
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
        background: ${(props) => rgba(props.theme.text, 0.1)};
      }
    }
  }
  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: ${(props) => props.theme.text};
    font-size: ${(props) => props.theme.font.size.base};
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
    scrollbar-width: thin;
    padding: 6px 0;
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
      background: ${(props) => rgba(props.theme.text, 0.2)};
      border-radius: 4px;
      &:hover {
        background: ${(props) => rgba(props.theme.text, 0.3)};
      }
    }
  }
  .result-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    margin: 2px 8px;
    gap: 10px;
    cursor: pointer;
    border-radius: ${(props) => props.theme.border.radius.base};
    transition: background 0.1s ease;
    &:hover:not(.selected) {
      background: ${(props) => rgba(props.theme.text, 0.05)};
    }
    &.selected {
      background: ${(props) => props.theme.dropdown.hoverBg};
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
    font-size: ${(props) => props.theme.font.size.base};
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${(props) => props.theme.text};
    letter-spacing: 0.2px;
  }
  .result-path {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.1px;
  }
  .method-badge {
    font-size: 0.625rem;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    flex-shrink: 0;
    min-width: 48px;
    text-align: center;
    &.get {
      color: ${(props) => props.theme.request.methods.get};
      background: ${(props) => rgba(props.theme.request.methods.get, 0.1)};
      border: 1px solid ${(props) => rgba(props.theme.request.methods.get, 0.2)};
    }
    &.post {
      color: ${(props) => props.theme.request.methods.post};
      background: ${(props) => rgba(props.theme.request.methods.post, 0.1)};
      border: 1px solid ${(props) => rgba(props.theme.request.methods.post, 0.2)};
    }
    &.put {
      color: ${(props) => props.theme.request.methods.put};
      background: ${(props) => rgba(props.theme.request.methods.put, 0.1)};
      border: 1px solid ${(props) => rgba(props.theme.request.methods.put, 0.2)};
    }
    &.delete {
      color: ${(props) => props.theme.request.methods.delete};
      background: ${(props) => rgba(props.theme.request.methods.delete, 0.1)};
      border: 1px solid ${(props) => rgba(props.theme.request.methods.delete, 0.2)};
    }
    &.patch {
      color: ${(props) => props.theme.request.methods.patch};
      background: ${(props) => rgba(props.theme.request.methods.patch, 0.1)};
      border: 1px solid ${(props) => rgba(props.theme.request.methods.patch, 0.2)};
    }
    &.head {
      color: ${(props) => props.theme.request.methods.head};
      background: ${(props) => rgba(props.theme.request.methods.head, 0.1)};
      border: 1px solid ${(props) => rgba(props.theme.request.methods.head, 0.2)};
    }
    &.options {
      color: ${(props) => props.theme.request.methods.options};
      background: ${(props) => rgba(props.theme.request.methods.options, 0.1)};
      border: 1px solid ${(props) => rgba(props.theme.request.methods.options, 0.2)};
    }
    &.unary {
      color: ${(props) => props.theme.request.methods.get};
      background: ${(props) => rgba(props.theme.request.methods.get, 0.12)};
      border: 1px solid ${(props) => rgba(props.theme.request.methods.get, 0.2)};
    }
    &.client-streaming {
      color: ${(props) => props.theme.request.methods.post};
      background: ${(props) => rgba(props.theme.request.methods.post, 0.12)};
      border: 1px solid ${(props) => rgba(props.theme.request.methods.post, 0.2)};
    }
    &.server-streaming {
      color: ${(props) => props.theme.request.methods.put};
      background: ${(props) => rgba(props.theme.request.methods.put, 0.12)};
      border: 1px solid ${(props) => rgba(props.theme.request.methods.put, 0.2)};
    }
    &.bidirectional-streaming,
    &.bidi-streaming {
      color: ${(props) => props.theme.colors.text.purple};
      background: ${(props) => rgba(props.theme.colors.text.purple, 0.12)};
      border: 1px solid ${(props) => rgba(props.theme.colors.text.purple, 0.2)};
    }
  }
  .result-type {
    font-size: 0.625rem;
    color: ${(props) => props.theme.textLink};
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    font-weight: 500;
    background: ${(props) => rgba(props.theme.textLink, 0.1)};
    border: 1px solid ${(props) => rgba(props.theme.textLink, 0.2)};
    flex-shrink: 0;
  }
  .result-item[data-type="documentation"] {
    .result-icon {
      color: ${(props) => props.theme.colors.text.muted};
      opacity: 0.8;
    }
    .result-path {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.muted};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: 0.1px;
      opacity: 0.8;
    }
  }
  .no-results,
  .empty-state {
    padding: 24px 16px;
    text-align: center;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.base};
  }
  .command-k-footer {
    padding: 8px 12px;
    border-top: 1px solid ${(props) => props.theme.border.border1};
    background: ${(props) => props.theme.colors.surface};
  }
  .keyboard-hints {
    display: flex;
    justify-content: center;
    gap: 24px;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.sm};
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
        border: 1px solid ${(props) => props.theme.border.border2};
        border-radius: 4px;
        background: ${(props) => rgba(props.theme.text, 0.08)};
        font-size: ${(props) => props.theme.font.size.xs};
        font-weight: 500;
        font-family: inherit;
        line-height: 1;
        color: ${(props) => props.theme.text};
      }
    }
  }
  .highlight {
    color: ${(props) => props.theme.brand};
    border-radius: 2px;
    padding: 1px 2px;
    margin: 0 -1px;
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
