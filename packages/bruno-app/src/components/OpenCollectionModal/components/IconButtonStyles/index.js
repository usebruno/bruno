import { css } from 'styled-components';

const iconButtonStyles = css`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: ${(props) => props.theme.border.radius.base};
  background: none;
  color: ${(props) => props.theme.colors.text.muted};
  cursor: pointer;

  &:hover {
    background: ${(props) => props.theme.background.surface1};
    color: ${(props) => props.theme.text};
  }
`;

export default iconButtonStyles;
