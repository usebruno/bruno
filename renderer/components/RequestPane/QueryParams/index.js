import React, { useState } from 'react';
import { nanoid } from 'nanoid';
import { IconTrash } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const initialState = [{
  uid: nanoid(),
  enabled: true
}];

const QueryParams = () => {
  const [params, setParams] = useState(initialState);

  const addParam = () => {
    let newParam = {
      uid: nanoid(),
      key: '',
      value: '',
      description: '',
      enabled: true
    };

    let newParams = [...params, newParam];
    setParams(newParams);
  };

  const handleParamValueChange = (e, index, menu) => {
    // todo: yet to implement
  };
  
  const handleRemoveHeader = (index) => {
    params.splice(index, 1);
    setParams([...params]);
  };
  
  return (
    <StyledWrapper className="mt-4">
      <table>
        <thead>
          <tr>
            <td>Key</td>
            <td>Value</td>
            <td>Description</td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {params && params.length ? params.map((header, index) => {
            return (
              <tr key={header.uid}>
                <td>
                  <input
                    type="text"
                    name="key"
                    autoComplete="off"
                    defaultValue={params[index].key}
                    onChange={(e) => handleParamValueChange(e, index, 'key')}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    name="value"
                    autoComplete="off"
                    defaultValue={params[index].value}
                    onChange={(e) => handleParamValueChange(e, index, 'value')}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    name="description"
                    autoComplete="off"
                    defaultValue={params[index].description}
                    onChange={(e) => handleParamValueChange(e, index, 'description')}
                  />
                </td>
                <td>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3"
                      defaultChecked={header.enabled}
                      name="enabled"
                      onChange={(e) => handleParamValueChange(e, index, 'enabled')}
                    />
                    <button onClick={() => handleRemoveHeader(index)}>
                      <IconTrash strokeWidth={1.5} size={20}/>
                    </button>
                  </div>
                </td>
              </tr>
            );
          }) : null}
        </tbody>
      </table>
      <button className="btn-add-param" onClick={addParam}>+ Add Param</button>
    </StyledWrapper>
  )
};
export default QueryParams;