import styled from 'styled-components';

const StyledWrapper = styled.div`
  overflow-y: auto;

  .ws-incoming {
    background: ${(props) => props.theme.table.striped};
    border-color: ${(props) => props.theme.table.border};
  }

  .ws-outgoing {
    background: ${(props) => props.theme.bg};
    border-color: ${(props) => props.theme.table.border};
  }
`;

export default StyledWrapper;
