import styled, { css } from 'styled-components';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { rgba } from 'polished';

const accentVariant = (status) => css`
  border-left: 3px solid ${(props) => props.theme.status[status].border};
`;

const variantStyles = {
  error: accentVariant('danger'),
  warning: accentVariant('warning'),
  rich: css`
    padding: 0.5rem 0.625rem;
    line-height: 1.5;

    a,
    .text-link {
      color: inherit;
      text-decoration: underline;
    }

    code {
      padding: 0 0.25rem;
      border-radius: ${(props) => props.theme.border.radius.sm};
      background-color: ${(props) => rgba(props.theme.bg, 0.12)};
    }
  `
};

const StyledTooltip = styled(ReactTooltip)`
  && {
    z-index: 9999;
    max-width: ${(props) => props.$maxWidth};
    ${(props) => props.$width && `width: ${props.$width};`}
    padding: 0.25rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 400;
    line-height: 1.4;
    white-space: normal;
    overflow-wrap: break-word;
    color: ${(props) => props.theme.bg};
    background-color: ${(props) => props.theme.text};
    border-radius: ${(props) => props.theme.border.radius.sm};
    box-shadow: ${(props) => props.theme.shadow.md};
    ${(props) => variantStyles[props.$variant]}
  }

  .tooltip-shortcut {
    margin-left: 0.5rem;
    font-family: inherit;
    color: ${(props) => rgba(props.theme.bg, 0.65)};
  }
`;

export default StyledTooltip;
