import styled from 'styled-components';

const Wrapper = styled.div`
  overflow-y: auto;
  .collections-badge {
    margin-inline: 0.5rem;
    background-color: ${(props) => props.theme.sidebar.badge.bg};
    border-radius: 5px;

    .caret {
      margin-left: 0.25rem;
      color: rgb(140, 140, 140);
      fill: rgb(140, 140, 140);
    }
  }

  span.close-icon {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default Wrapper;
