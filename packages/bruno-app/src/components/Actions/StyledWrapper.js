import styled from 'styled-components';

const StyledWrapper = styled.div`
  .group {
    border: solid 2px;
    border-color: ${(props) => props.theme.dropdown.bg};
    border-radius: 5px;
    margin-right: 2px;
    display: grid;
  }
  .group-title {
    text-align: center;
  }
`;

export default StyledWrapper;
