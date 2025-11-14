import styled from 'styled-components';

const Wrapper = styled.div`
  .collections-badge {
    margin-inline: 0.5rem;
    background-color: ${(props) => props.theme.sidebar.badge.bg};
    border-radius: 5px;

    .caret {
      margin-left: 0.25rem;
      color: rgb(140, 140, 140);
      fill: rgb(140, 140, 140);
    }

    .collections-header-actions {
      .collection-action-button {
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
      }
    }
  }
`;

export default Wrapper;
