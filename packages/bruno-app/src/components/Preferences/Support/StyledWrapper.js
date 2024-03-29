import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};
  .rows {
    svg {
      position: relative;
      top: -1px;
    }

    .label {
      cursor: pointer;
      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

export default StyledWrapper;
