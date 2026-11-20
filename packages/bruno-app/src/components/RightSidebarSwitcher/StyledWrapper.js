import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;

  .switch-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;

    &:hover {
      background: ${(props) => props.theme.background.surface0};
      color: ${(props) => props.theme.text};
    }

    &.is-active {
      background: color-mix(in srgb, ${(props) => props.theme.primary.text} 14%, transparent);
      color: ${(props) => props.theme.primary.text};
      cursor: default;
    }
  }
`;

export default StyledWrapper;
