import styled from 'styled-components';

const Wrapper = styled.div`
  .current-workspace {
    margin-inline: 0.5rem;
    background-color: ${(props) => props.theme.sidebar.workspace.bg};
    border-radius: 5px;

    .caret {
      margin-left: 0.25rem;
      color: rgb(140, 140, 140);
      fill: rgb(140, 140, 140);
    }
  }

  div[data-tippy-root] {
    width: calc(100% - 1rem);
  }
`;

export default Wrapper;
