import { Checkbox, Inner, Label, Switch, SwitchButton } from './StyledWrapper';

const ToggleSwitch = ({ isOn, handleToggle, size, ...props }) => {
  return (
    <Switch size={size} {...props}>
      <Checkbox checked={isOn} onChange={handleToggle} id="toggle-switch" type="checkbox" />
      <Label htmlFor="toggle-switch">
        <Inner />
        <SwitchButton />
      </Label>
    </Switch>
  );
};

export default ToggleSwitch;
