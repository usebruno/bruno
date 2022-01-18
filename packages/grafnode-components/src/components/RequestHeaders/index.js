import React, { useState } from 'react';
import { nanoid } from 'nanoid';
import { IconTrash } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const initialState = [{
  uid: nanoid(),
  enabled: true
}];

const RequestHeaders = () => {
  const [headers, setHeaders] = useState(initialState);

  const addHeader = () => {
    let newHeader = {
      uid: nanoid(),
      key: '',
      value: '',
      description: '',
      enabled: true
    };

    let newHeaders = [...headers, newHeader];
    setHeaders(newHeaders);
  };

  const handleHeaderValueChange = (e, index, menu) => {
    // todo: yet to implement
  };
  
  const handleRemoveHeader = (index) => {
    headers.splice(index, 1);
    setHeaders([...headers]);
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
          {headers && headers.length ? headers.map((header, index) => {
            return (
              <tr key={header.uid}>
                <td>
                  <input
                    type="text"
                    name="key"
                    autocomplete="off"
                    defaultValue={headers[index].key}
                    onChange={(e) => handleHeaderValueChange(e, index, 'key')}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    name="value"
                    autocomplete="off"
                    defaultValue={headers[index].value}
                    onChange={(e) => handleHeaderValueChange(e, index, 'value')}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    name="description"
                    autocomplete="off"
                    defaultValue={headers[index].description}
                    onChange={(e) => handleHeaderValueChange(e, index, 'description')}
                  />
                </td>
                <td>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3"
                      defaultChecked={header.enabled}
                      name="enabled"
                      onChange={(e) => handleHeaderValueChange(e, index, 'enabled')}
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
      <button className="btn-add-header" onClick={addHeader}>+ Add Header</button>
    </StyledWrapper>
  )
};
export default RequestHeaders;