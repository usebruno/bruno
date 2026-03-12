import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .code-snippet {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.4;
    overflow-x: auto;
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => props.theme.background.elevated};
    border: 1px solid ${(props) => props.theme.border.border2};
  }

  .code-line {
    display: flex;
    align-items: stretch;
  }

  .code-line.highlighted-error {
    background-color: ${(props) => rgba(props.theme.colors.text.danger, 0.1)};
    border-left: 3px solid ${(props) => props.theme.colors.text.danger};
  }

  .code-line.highlighted-warning {
    background-color: ${(props) => rgba(props.theme.colors.text.warning, 0.1)};
    border-left: 3px solid ${(props) => props.theme.colors.text.warning};
  }

  .code-line:not(.highlighted-error):not(.highlighted-warning) {
    border-left: 3px solid transparent;
  }

  .code-line-number {
    min-width: 2.5rem;
    text-align: right;
    padding: 0 0.5rem;
    color: ${(props) => props.theme.colors.text.muted};
    user-select: none;
    flex-shrink: 0;
  }

  .code-line-content {
    white-space: pre;
    padding: 0 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .code-line-separator {
    border-left: 3px solid transparent;
  }

  .separator-content {
    color: ${(props) => props.theme.colors.text.muted};
    user-select: none;
    padding: 0 0.5rem;
  }
`;

export default StyledWrapper;
