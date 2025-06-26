import styled from 'styled-components';

const StyledWrapper = styled.div`
  .command-k-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .command-k-modal {
    background: ${(props) => props.theme.modal.body.bg};
    border: 1px solid ${(props) => props.theme.modal.input.border};
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05);
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: modalSlideIn 0.2s ease-out;
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .command-k-header {
    padding: 16px;
    border-bottom: 1px solid ${(props) => props.theme.modal.input.border};
    background: ${(props) => props.theme.modal.body.bg};
  }

  .search-input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    color: ${(props) => props.theme.colors.text.muted};
    z-index: 1;
  }

  .search-input {
    width: 100%;
    padding: 12px 40px 12px 40px;
    border: 1px solid ${(props) => props.theme.modal.input.border};
    border-radius: 8px;
    background: ${(props) => props.theme.modal.input.bg};
    color: ${(props) => props.theme.text};
    font-size: 16px;
    outline: none;
    transition: border-color 0.2s ease;

    &:focus {
      border-color: ${(props) => props.theme.brand};
      box-shadow: 0 0 0 3px rgba(84, 109, 229, 0.1);
    }

    &::placeholder {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .clear-button {
    position: absolute;
    right: 12px;
    background: none;
    border: none;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      background: ${(props) => props.theme.dropdown.hoverBg};
      color: ${(props) => props.theme.text};
    }
  }

  .command-k-results {
    flex: 1;
    overflow-y: auto;
    max-height: 400px;
    background: ${(props) => props.theme.modal.body.bg};
  }

  .result-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 1px solid ${(props) => props.theme.modal.input.border};
    position: relative;
    background: ${(props) => props.theme.modal.body.bg};

    &.selected,
    &[data-selected='true'] {
      background: ${(props) => props.theme.brand} !important;
      color: white !important;

      .result-icon,
      .result-path,
      .result-name {
        color: white !important;
      }

      .result-type {
        background: rgba(255, 255, 255, 0.2) !important;
        color: white !important;
      }
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .result-icon {
    margin-right: 12px;
    color: ${(props) => props.theme.colors.text.muted};
    flex-shrink: 0;
    transition: color 0.2s ease;
  }

  .result-content {
    flex: 1;
    min-width: 0;
  }

  .result-name {
    font-weight: 500;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${(props) => props.theme.text};
  }

  .result-path {
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.2s ease;
  }

  .result-type {
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
    background: ${(props) => props.theme.dropdown.labelBg};
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 500;
    letter-spacing: 0.5px;
    flex-shrink: 0;
    transition: all 0.2s ease;

    &.path-match {
      background: ${(props) => props.theme.dropdown.labelBg};
      color: ${(props) => props.theme.colors.text.muted};
      border: none;
    }
  }

  .no-results,
  .empty-state {
    padding: 32px 16px;
    text-align: center;
    color: ${(props) => props.theme.colors.text.muted};
    background: ${(props) => props.theme.modal.body.bg};
  }

  .command-k-footer {
    padding: 12px 16px;
    border-top: 1px solid ${(props) => props.theme.modal.input.border};
    background: ${(props) => props.theme.dropdown.labelBg};
  }

  .keyboard-hints {
    display: flex;
    gap: 16px;
    justify-content: center;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};

    span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
`;

export default StyledWrapper; 