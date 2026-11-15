import { useId } from 'react';
import { Checkbox, Inner, Label, Switch, SwitchButton } from './StyledWrapper';

const ToggleSwitch = ({ isOn, handleToggle, size = 'm', activeColor, disabled = false, ...props }) => {
  const id = useId();

  return (
    <Switch
      size={size}
      {...props}
    >
      <Checkbox
        checked={isOn}
        id={id}
        type="checkbox"
        size={size}
        activeColor={activeColor}
        disabled={disabled}
        onInput={handleToggle}
      />
      <Label htmlFor={id}>
        <Inner size={size} />
        <SwitchButton size={size} />
      </Label>
    </Switch>
  );
};

export default ToggleSwitch;
