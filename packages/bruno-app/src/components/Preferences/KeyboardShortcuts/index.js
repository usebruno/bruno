import StyledWrapper from './StyledWrapper';
import React from 'react';
import { useTheme } from 'providers/Theme';
import { KeyMapping } from 'providers/Hotkeys/keyMapping';
import { keyMap } from 'graphql/jsutils/keyMap';

const KeyboardShortcuts = ({ close }) => {
  const { storedTheme } = useTheme();

  return (
    <StyledWrapper className="w-full">
      <table>
        <thead>
          <tr>
            <td>Command</td>
            <td>Keybinding</td>
          </tr>
        </thead>
        <tbody>
          {KeyMapping
            ? Object.keys(KeyMapping).map((param, index) => {
                return (
                  <tr>
                    <td>{KeyMapping[param].name}</td>
                    <td>{KeyMapping[param].keys.join(',')}</td>
                  </tr>
                );
              })
            : null}
        </tbody>
      </table>
    </StyledWrapper>
  );
};

export default KeyboardShortcuts;
