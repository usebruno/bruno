import styled from 'styled-components';

const StyledModeSwitch = styled.button`
  position: relative;
  width: 80px;
  height: 32px;
  padding: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${(props) => props.theme.dropdown.bg};
  border: 1px solid ${(props) => props.theme.dropdown.separator};
  border-radius: 4px;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
  cursor: pointer;

  .mode-switch-thumb {
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 3px;
    width: 34px;
    background: ${(props) => props.theme.dropdown.hoverBg};
    border-radius: 3px;
    transition: transform 0.2s ease;
    transform: translateX(${(props) => (props.$checked ? '36px' : '0')});
  }

  .mode-switch-side {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50%;
    height: 100%;
    color: ${(props) => props.theme.dropdown.iconColor};
    transition: color 0.2s ease;

    &.is-active {
      color: ${(props) => props.theme.dropdown.selectedColor};
    }
  }
`;

const ModeSwitch = ({ checked, onChange, leftComponent, rightComponent, className, ...props }) => {
  return (
    <StyledModeSwitch
      type="button"
      onClick={onChange}
      className={className}
      $checked={checked}
      aria-label={checked ? 'Switch to WYSIWYG mode' : 'Switch to Markdown mode'}
      {...props}
    >
      <div className="mode-switch-thumb" />
      {leftComponent && (
        <span className={`mode-switch-side ${!checked ? 'is-active' : ''}`}>{leftComponent}</span>
      )}
      {rightComponent && (
        <span className={`mode-switch-side ${checked ? 'is-active' : ''}`}>{rightComponent}</span>
      )}
    </StyledModeSwitch>
  );
};

export default ModeSwitch;
