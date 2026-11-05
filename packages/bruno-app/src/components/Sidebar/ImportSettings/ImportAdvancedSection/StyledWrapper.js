import styled from 'styled-components';

const StyledWrapper = styled.div`
  border-top: 1px solid ${(props) => props.theme.border.border1};

  .advanced-chevron {
    transition: transform 0.15s ease;
  }

  .advanced-toggle[aria-expanded='true'] .advanced-chevron {
    transform: rotate(90deg);
  }

  .advanced-toggle[aria-expanded='true'] + .advanced-content {
    margin-top: 1rem;
  }

  .advanced-toggle[aria-expanded='false'] + .advanced-content {
    height: 0;
    overflow: hidden;
    visibility: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .advanced-chevron {
      transition: none;
    }
  }
`;

export default StyledWrapper;
