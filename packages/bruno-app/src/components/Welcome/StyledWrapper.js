import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.theme['primary-text']};

  .create-request {
    color: #737373;
    font-size: 0.75rem;
  }

  .collection-options {
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

export const SiteTitle = styled.div`
  color: ${(props) => props.theme.theme['primary-text']};
`;

export default StyledWrapper;
