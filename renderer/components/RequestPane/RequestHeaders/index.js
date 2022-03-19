import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { requestChanged } from 'providers/ReduxStore/slices/tabs';
import { addRequestHeader, updateRequestHeader, deleteRequestHeader } from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';

const RequestHeaders = ({item, collection}) => {
  const dispatch = useDispatch();
  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');

  const addHeader = () => {
    dispatch(requestChanged({
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
    dispatch(addRequestHeader({
      itemUid: item.uid,
      collectionUid: collection.uid,
    }));
  };

  const handleHeaderValueChange = (e, _header, type) => {
    const header = cloneDeep(_header);
    switch(type) {
      case 'name' : {
        header.name = e.target.value;
        break;
      }
      case 'value' : {
        header.value = e.target.value;
        break;
      }
      case 'description' : {
        header.description = e.target.value;
        break;
      }
    }
    dispatch(requestChanged({
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
    dispatch(updateRequestHeader({
      header: header,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };
  
  const handleRemoveHeader = (header) => {
    dispatch(requestChanged({
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
    dispatch(deleteRequestHeader({
      headerUid: header.uid,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
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
                    autoComplete="off"
                    value={header.name}
                    className="mousetrap"
                    onChange={(e) => handleHeaderValueChange(e, header, 'name')}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    autoComplete="off"
                    value={header.value}
                    className="mousetrap"
                    onChange={(e) => handleHeaderValueChange(e, header, 'value')}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    autoComplete="off"
                    value={header.description}
                    className="mousetrap"
                    onChange={(e) => handleHeaderValueChange(e, header, 'description')}
                  />
                </td>
                <td>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      className="mr-3 mousetrap"
                      onChange={(e) => handleHeaderValueChange(e, header, 'enabled')}
                    />
                    <button onClick={() => handleRemoveHeader(header)}>
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