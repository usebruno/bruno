import styled from 'styled-components';

const StyledWrapper = styled.div`
  .migration-report {
    max-height: 200px;
    overflow: auto;
    background-color: ${(props) => props.theme.modal.title.bg};
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: 4px;
    padding: 12px;
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};
    white-space: pre-wrap;
    margin: 0;
  }
`;

export default StyledWrapper;
