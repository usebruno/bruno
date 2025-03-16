import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  .path-display {
    background: ${(props) => props.theme.requestTabPanel.url.bg};
    border-radius: 4px;
    padding: 8px 12px;

    .filename {
      color: ${(props) => props.theme.brand};
      font-weight: 500;
      min-height: 1.25rem;
    }

    .file-extension {
      color: ${(props) => props.theme.text};
      opacity: 0.5;
    }
  }
`;

export default StyledWrapper; 