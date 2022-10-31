import styled from 'styled-components';

const StyledWrapper = styled.div`
  .heading {
    color: ${(props) => props.theme.welcome.heading};
    font-size: 0.75rem;
  }

  .muted {
    color: ${(props) => props.theme.welcome.muted};
  }

  .collection-options {
    cursor: pointer;

    svg {
      position: relative;
      top: -1px;
    }

    .label {
      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

export default StyledWrapper;
