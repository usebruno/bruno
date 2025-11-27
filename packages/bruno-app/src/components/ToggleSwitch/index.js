import { Checkbox, Inner, Label, Switch, SwitchButton } from './StyledWrapper';

const ToggleSwitch = ({ isOn, handleToggle, size = 'm', activeColor, ...props }) => {
  return (
    <Switch size={size} {...props} onClick={handleToggle}>
      <Checkbox checked={isOn} type="checkbox" size={size} activeColor={activeColor} onChange={() => {}} />
      <Label>
        <Inner size={size} />
        <SwitchButton size={size} />
      </Label>
    </Switch>
  );
};

export default ToggleSwitch;
