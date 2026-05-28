import styled from 'styled-components';

const ScanWarning = styled.div`
  color: ${(props) => props.theme.status.warning.text};
  background-color: ${(props) => props.theme.status.warning.background};
  border: 1px solid ${(props) => props.theme.status.warning.border};
  border-radius: ${(props) => props.theme.border.radius.base};
  padding: 0.375rem 0.5rem;
  font-size: ${(props) => props.theme.font.size.sm};

  .scan-warning-icon {
    color: ${(props) => props.theme.status.warning.text};
    flex-shrink: 0;
  }

  .scan-warning-action {
    background: transparent;
    border: 0;
    padding: 0;
    color: inherit;
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
    flex-shrink: 0;
  }

  .scan-warning-list {
    list-style: none;
    margin: 0.5rem 0 0;
    padding: 0;
    max-height: 8rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .scan-warning-list li {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding: 0.25rem 0;
    border-top: 1px solid ${(props) => props.theme.status.warning.border};
  }

  .scan-warning-list li:first-child {
    border-top: 0;
  }

  .scan-warning-path {
    font-family: ${(props) => props.theme.font.codeFont};
    font-size: ${(props) => props.theme.font.size.xs};
    word-break: break-all;
  }

  .scan-warning-reason {
    font-size: ${(props) => props.theme.font.size.xs};
    opacity: 0.85;
  }
`;

export default ScanWarning;
