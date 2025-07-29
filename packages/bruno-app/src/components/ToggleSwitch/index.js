import { Checkbox, Inner, Label, Switch, SwitchButton } from './StyledWrapper';

const ToggleSwitch = ({ isOn, handleToggle, size = 'm', ...props }) => {
  return (
    <Switch size={size} {...props} onClick={handleToggle}>
      <Checkbox checked={isOn} id="toggle-switch" type="checkbox" size={size} />
      <Label htmlFor="toggle-switch">
        <Inner size={size} />
        <SwitchButton size={size} />
      </Label>
    </Switch>
  );
};

export default ToggleSwitch;
