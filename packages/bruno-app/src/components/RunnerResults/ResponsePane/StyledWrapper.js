import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${(props) => props.theme.bg};

  div.tabs {
    padding: 0;
    border-bottom: 1px solid ${(props) => props.theme.requestTabPanel.card.border}30;
    background: ${(props) => props.theme.requestTabPanel.card.bg}20;
    display: flex;
    align-items: center;
    
    div.tab {
      padding: 8px 12px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: 0.75rem;
      color: var(--color-tab-inactive);
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
      font-size: 12px;
      position: relative;
      bottom: -1px;

      &:hover {
        background: ${(props) => props.theme.dropdown.hoverBg}30;
      }

      &:focus,
      &:active,
      &:focus-within,
      &:focus-visible,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &.active {
        color: ${(props) => props.theme.tabs.active.color} !important;
        border-bottom: solid 2px ${(props) => props.theme.tabs.active.border} !important;
        background: ${(props) => props.theme.dropdown.hoverBg}20;
      }
    }
  }

  .some-tests-failed {
    color: ${(props) => props.theme.colors.text.danger} !important;
  }

  .all-tests-passed {
    color: ${(props) => props.theme.colors.text.green} !important;
  }
  
  section {
    padding: 12px;
    overflow: auto;
    flex: 1;
    
    &::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: ${props => props.theme.scrollbar.color};
      border-radius: 2px;
    }
  }
  
  .response-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 8px 10px;
    background: ${(props) => props.theme.requestTabPanel.card.bg}15;
    border-radius: 4px;
    margin-bottom: 12px;
    
    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: ${(props) => props.theme.colors.text.muted};
      
      .label {
        font-weight: 500;
      }
      
      .value {
        font-weight: 600;
      }
      
      &.status {
        .value {
          padding: 2px 6px;
          border-radius: 3px;
          background: ${(props) => props.theme.bg};
        }
        
        &.success .value {
          color: ${(props) => props.theme.colors.text.green};
          background: ${(props) => props.theme.colors.text.green}10;
        }
        
        &.error .value {
          color: ${(props) => props.theme.colors.text.danger};
          background: ${(props) => props.theme.colors.text.danger}10;
        }
      }
    }
  }
  
  pre {
    background: ${(props) => props.theme.requestTabPanel.card.bg}20;
    padding: 10px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    overflow: auto;
    margin: 0;
    
    &::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: ${props => props.theme.scrollbar.color};
      border-radius: 2px;
    }
  }
  
  /* Styling for code blocks */
  code {
    font-family: monospace;
    font-size: 12px;
  }
  
  /* Styling for response content */
  .response-content {
    height: 100%;
    overflow: auto;
  }
`;

export default StyledWrapper;
