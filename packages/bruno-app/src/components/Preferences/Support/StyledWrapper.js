import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;

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
