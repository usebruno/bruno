import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  .path-display {
    background: ${(props) => props.theme.requestTabPanel.url.bg};
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 0.8125rem;
    border: 1px solid rgba(0, 0, 0, 0.08);
    
    .icon-column {
      padding-right: 8px;
      align-items: flex-start;
      padding-top: 2px;
    }

    .path-container {
      flex-wrap: wrap;
    }

    .path-segment {
      white-space: nowrap;
    }

    
    .filename, .file-extension {
      color: ${(props) => props.theme.colors.text.yellow};
    }

    .separator {
      color: ${(props) => props.theme.text};
      opacity: 0.6;
      margin: 0 2px;
    }
  }
`;

export default StyledWrapper; 