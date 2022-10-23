import styled from 'styled-components';

const Wrapper = styled.div`
  div {
    padding: 4px 6px;
    padding-left: 8px;
    display: flex;
    align-items: center;
    border-radius: 3px;
  }

  div:hover {
    background-color: ${(props) => props.theme.plainGrid.hoverBg};
  }
`;

export default Wrapper;
