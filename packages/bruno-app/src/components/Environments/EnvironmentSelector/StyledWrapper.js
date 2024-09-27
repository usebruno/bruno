import styled from 'styled-components';

const Wrapper = styled.div`
  .current-environment {
    background-color: ${(props) => props.theme.sidebar.badge.bg};
    border-radius: 15px;

    .caret {
      margin-left: 0.25rem;
      color: rgb(140, 140, 140);
      fill: rgb(140, 140, 140);
    }
  }
`;

export default Wrapper;
