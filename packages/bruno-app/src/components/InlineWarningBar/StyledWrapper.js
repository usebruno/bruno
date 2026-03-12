import styled from 'styled-components';

const StyledWrapper = styled.div`
  .inline-warning-bar {
    display: flex;
    align-items: flex-start;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border: 1px solid ${(props) => props.theme.status.warning.border};
    background: ${(props) => props.theme.status.warning.background};
    border-radius: 4px;
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
    color: ${(props) => props.theme.status.warning.text};
  }

  .inline-warning-icon {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .inline-warning-title {
    font-weight: 600;
    flex: 1;
  }

  .inline-warning-toggle {
    background: none;
    border: none;
    padding: 0;
    margin-left: 4px;
    font-size: inherit;
    font-family: inherit;
    font-weight: 600;
    color: ${(props) => props.theme.status.warning.text};
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;

    &:hover {
      opacity: 0.7;
    }
  }

  .inline-warning-dismiss {
    color: ${(props) => props.theme.status.warning.text};
    padding: 2px;
    margin-top: -1px;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    flex-shrink: 0;

    &:hover {
      opacity: 0.7;
    }
  }
`;

export default StyledWrapper;
