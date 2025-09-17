import styled from 'styled-components';

const StyledWrapper = styled.div`
  overflow-y: auto; 

  .ws-message.new {
    background-color: ${({theme}) => theme.table.striped};
  }

  .ws-message:not(:last-child) {
    border-bottom: 1px solid ${({theme}) => theme.table.border};
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

  .CodeMirror { 
    border-radius: 0.25rem;
  }

  .CodeMirror-foldgutter, .CodeMirror-linenumbers, .CodeMirror-lint-markers {
    background: ${({theme})=> theme.bg};
  }

  div[role='tablist'] {
    .active {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }

`;

export default StyledWrapper;
