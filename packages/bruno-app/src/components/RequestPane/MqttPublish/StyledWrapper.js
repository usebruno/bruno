import styled from 'styled-components';

const StyledWrapper = styled.div`
  .publish-btn {
    color: white;
    background-color: ${(props) => props.theme.textLink};

    &:hover {
      opacity: 0.9;
    }
  }
`;

export default StyledWrapper;
