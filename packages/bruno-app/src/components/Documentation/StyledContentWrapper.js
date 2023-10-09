import styled from 'styled-components';

const StyledContentWrapper = styled.div`
  height: calc(100vh - 100px);
  margin-right: 5px;
  margin-left: 5px;

  background-color: ${(props) => props.theme.rightPane.bg};

  .text-end {
    text-align: end;
  }

  ::-webkit-scrollbar {
    width: 0px;
  }

  ::-webkit-scrollbar-button {
    display: none;
  }
`;

export default StyledContentWrapper;
