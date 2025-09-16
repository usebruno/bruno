import styled from 'styled-components';

const StyledWrapper = styled.div`
  overflow-y: auto; 

  .ws-message:not(:last-child) {
    border-bottom: 1px solid ${(props) => props.theme.table.border};
  }

  .ws-message:not(:last-child).open {
    border-bottom-width: 0px;
  }

  .ws-incoming {
    background: ${(props) => props.theme.bg};
    border-color: ${(props) => props.theme.table.border};
  }

  .ws-outgoing {
    background: ${(props) => props.theme.bg};
    border-color: ${(props) => props.theme.table.border};
  }
`;

export default StyledWrapper;
