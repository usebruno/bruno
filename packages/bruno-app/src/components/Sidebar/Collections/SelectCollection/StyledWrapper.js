import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.collection {
    padding: 4px 6px;
    padding-left: 8px;
    display: flex;
    align-items: center;
    border-radius: 3px;
    cursor: pointer;

    &:hover {
      background-color: ${(props) => props.theme.plainGrid.hoverBg};
    }
  }
`;

export default StyledWrapper;
