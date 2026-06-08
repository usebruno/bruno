import { useId } from 'react';
import { Checkbox, Inner, Label, Switch, SwitchButton } from './StyledWrapper';

const ToggleSwitch = ({ isOn, handleToggle, size = 'm', activeColor, ...props }) => {
  const id = useId();
  return (
    <Switch size={size} {...props} onClick={handleToggle}>
      <Checkbox checked={isOn} id={id} type="checkbox" size={size} activeColor={activeColor} onChange={() => {}} />
      <Label htmlFor={id}>
        <Inner size={size} />
        <SwitchButton size={size} />
      </Label>
    </Switch>
  );
};

export default ToggleSwitch;
