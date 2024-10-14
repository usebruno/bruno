import StyledWrapper from './StyledWrapper';
import React from 'react';
import { getKeyBindingsForOS } from 'providers/Hotkeys/keyMappings';
import { isMacOS } from 'utils/common/platform';

const Keybindings = ({ close }) => {
  const keyMapping = getKeyBindingsForOS(isMacOS() ? 'mac' : 'windows');

  return (
    <StyledWrapper className="w-full">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Command</th>
              <th>Keybinding</th>
            </tr>
          </thead>
          <tbody>
            {keyMapping ? (
              Object.entries(keyMapping).map(([action, { name, keys }], index) => (
                <tr key={index}>
                  <td>{name}</td>
                  <td>
                    {keys.split('+').map((key, i) => (
                      <div className="key-button" key={i}>
                        {key}
                      </div>
                    ))}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2">No key bindings available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </StyledWrapper>
  );
};

export default Keybindings;
