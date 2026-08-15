import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .version-value-wrap {
    display: flex;
    min-width: 0;
    max-width: 220px;
  }

  .version-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .icon-box {
    &.location {
      background-color: ${(props) => rgba(props.theme.textLink, 0.08)};
      border: 1px solid ${(props) => rgba(props.theme.textLink, 0.09)};

      svg {
        color: ${(props) => props.theme.textLink};
      }
    }

    &.environments {
      background-color: ${(props) => rgba(props.theme.colors.text.green, 0.08)};
      border: 1px solid ${(props) => rgba(props.theme.colors.text.green, 0.09)};

      svg {
        color: ${(props) => props.theme.colors.text.green};
      }
    }

    &.requests {
      background-color: ${(props) => rgba(props.theme.colors.text.purple, 0.08)};
      border: 1px solid ${(props) => rgba(props.theme.colors.text.purple, 0.09)};

      svg {
        color: ${(props) => props.theme.colors.text.purple};
      }
    }

    &.share {
      background-color: ${(props) => rgba(props.theme.textLink, 0.08)};
      border: 1px solid ${(props) => rgba(props.theme.textLink, 0.09)};

      svg {
        color: ${(props) => props.theme.textLink};
      }
    }

    &.version {
      background-color: ${(props) => rgba(props.theme.colors.text.yellow, 0.1)};
      border: 1px solid ${(props) => rgba(props.theme.colors.text.yellow, 0.1)};

      svg {
        color: ${(props) => props.theme.colors.text.yellow};
      }
    }

    &.generate-docs {
      background-color: ${(props) => rgba(props.theme.accents.primary, 0.08)};
      border: 1px solid ${(props) => rgba(props.theme.accents.primary, 0.09)};

      svg {
        color: ${(props) => props.theme.accents.primary};
      }
    }
  }
`;

export default StyledWrapper;
