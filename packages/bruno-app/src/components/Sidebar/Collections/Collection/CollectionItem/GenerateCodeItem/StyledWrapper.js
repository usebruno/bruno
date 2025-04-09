import styled from 'styled-components';

const StyledWrapper = styled.div`
  margin: -1.5rem -1rem;
  height: 50vh;
  display: flex;
  flex-direction: column;
 background-color: ${(props) => props.theme.collection.environment.settings.bg};

  .code-generator {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    background: ${props => props.theme.requestTabPanel.card.bg};
    gap: 8px;

    .right-controls {
      .interpolate-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;

        input[type="checkbox"] {
          cursor: pointer;
        }

        span {
          font-size: 13px;
        }
      }
    }
  }

  .left-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .select-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .custom-select {
    background: ${props => props.theme.requestTabPanel.url.bg};
    border: 1px solid ${props => props.theme.input.border};
    border-radius: 3px;
    color: ${props => props.theme.text};
    font-size: 12px;
    padding: 4px 28px 4px 8px;
    min-width: 160px;
    height: 28px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .select-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: ${props => props.theme.bg};
    border: 1px solid ${props => props.theme.input.border};
    border-radius: 3px;
    margin-top: 4px;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .language-search {
    width: 100%;
    padding: 8px;
    border: none;
    border-bottom: 1px solid ${props => props.theme.input.border};
    background: ${props => props.theme.requestTabPanel.url.bg};
    color: ${props => props.theme.text};
    font-size: 12px;

    &:focus {
      outline: none;
    }
  }

  .options-list {
    max-height: 200px;
    overflow-y: auto;
    scrollbar-width: thin;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: ${props => props.theme.bg};
    }
    
    &::-webkit-scrollbar-thumb {
      background: ${props => props.theme.colors.text.muted};
      border-radius: 3px;
    }
  }

  .option {
    padding: 6px 8px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    &.highlighted {
      background: ${props => props.theme.dropdown.hoverBg};
    }

    .check-icon {
      color: ${props => props.theme.text};
      opacity: 0.7;
    }
  }

  .select-arrow {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: ${props => props.theme.colors.text.muted};
    transition: all 0.2s ease;
  }

  .select-wrapper:hover .select-arrow {
    color: ${props => props.theme.text};
  }

  .library-options {
    display: flex;
    gap: 4px;
  }

  .lib-btn {
    height: 28px;
    padding: 0 12px;
    background: ${props => props.theme.requestTabPanel.url.bg};
    border-radius: 3px;
    color: ${props => props.theme.text};
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: ${props => props.theme.dropdown.hoverBg};
    }

    &.active {
      background: ${props => props.theme.button.secondary.bg};
    }
  }

  .editor-container {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: ${props => props.theme.bg};
    padding: 0;
  }

  .error-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #d4d4d4;
    text-align: center;
    padding: 20px;

    h1 {
      font-size: 14px;
      margin-bottom: 8px;
    }

    p {
      color: #888;
      font-size: 12px;
    }
  }
`;

export default StyledWrapper;

