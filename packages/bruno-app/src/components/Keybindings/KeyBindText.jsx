import { Modifier } from 'hooks/useKeybindings';
import usePlatform, { PlatformKind } from 'hooks/usePlatform';

export const KeyBindText = ({ keybinding, keybindingConfig }) => {
  const platform = usePlatform();
  if (!keybindingConfig || !keybinding) return null;

  const { modifiers = [], description } = keybindingConfig;
  const modifierString = modifiers
    .map((mod) => {
      if (mod === Modifier.CmdOrCtrl) {
        return platform === PlatformKind.MacOS ? 'Cmd' : 'Ctrl';
      }
      if (mod === Modifier.Alt) return 'Alt';
      if (mod === Modifier.Shift) return 'Shift';
      return mod;
    })
    .join('+');

  const keyLabel = keybinding.length === 1 ? keybinding.toUpperCase() : keybinding.join('/');
  const hint = modifierString ? `${modifierString}+${keyLabel}` : keyLabel;

  return (
    <span className="dropdown-label-with-keybind">
      <span>{description}</span>{' - '}
      <kbd className="dropdown-keybind-hint">{hint}</kbd>
    </span>
  );
};

export default KeyBindText;
