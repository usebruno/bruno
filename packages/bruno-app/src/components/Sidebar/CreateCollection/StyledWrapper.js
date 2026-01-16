import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .beta-badge {
    margin-left: 0.5rem;
    padding: 0.125rem 0.5rem;
    font-size: 0.625rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    background-color: ${(props) => rgba(props.theme.colors.text.yellow, 0.15)};
    color: ${(props) => props.theme.colors.text.yellow};
    border-radius: ${(props) => props.theme.border.radius.sm};
  }

  .discussion-link {
    margin-left: 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.textLink};
    cursor: pointer;
    font-weight: 400;

    &:hover {
      text-decoration: underline;
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
