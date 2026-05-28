import styled from 'styled-components';

const StyledWrapper = styled.div`
  .advanced-options {
    .caret {
      color: ${(props) => props.theme.textLink};
      fill: ${(props) => props.theme.textLink};
    }
  }

  .report-issue-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.textLink};
    cursor: pointer;
    transition: opacity 0.15s ease;

    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }

    svg {
      flex-shrink: 0;
    }
  }
`;

export default StyledWrapper;
