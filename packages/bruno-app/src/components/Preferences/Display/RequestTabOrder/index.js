import { savePreferences } from 'providers/ReduxStore/slices/app';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';

const RequestTabOrder = () => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  const handleScopeChange = (e) => {
    dispatch(
      savePreferences({
        ...preferences,
        requestTabOrderPersistenceScope: e.target.value
      })
    );
  };

  return (
    <StyledWrapper>
      <div className="flex flex-col gap-2">
        <label className="block font-medium select-none">Request Tab Order Persistence</label>
        <div className="flex flex-col gap-2 ml-1">
          <div className="flex items-center">
            <input
              id="scope-global"
              type="radio"
              name="requestTabOrderPersistenceScope"
              value="global"
              checked={preferences.requestTabOrderPersistenceScope === 'global' || !preferences.requestTabOrderPersistenceScope}
              onChange={handleScopeChange}
              className="mousetrap mr-0"
            />
            <label className="block ml-2 select-none cursor-pointer" htmlFor="scope-global">
              Global (Per User)
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="scope-collection"
              type="radio"
              name="requestTabOrderPersistenceScope"
              value="collection"
              checked={preferences.requestTabOrderPersistenceScope === 'collection'}
              onChange={handleScopeChange}
              className="mousetrap mr-0"
            />
            <label className="block ml-2 select-none cursor-pointer" htmlFor="scope-collection">
              Per Collection
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="scope-folder"
              type="radio"
              name="requestTabOrderPersistenceScope"
              value="folder"
              checked={preferences.requestTabOrderPersistenceScope === 'folder'}
              onChange={handleScopeChange}
              className="mousetrap mr-0"
            />
            <label className="block ml-2 select-none cursor-pointer" htmlFor="scope-folder">
              Per Folder
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="scope-request"
              type="radio"
              name="requestTabOrderPersistenceScope"
              value="request"
              checked={preferences.requestTabOrderPersistenceScope === 'request'}
              onChange={handleScopeChange}
              className="mousetrap mr-0"
            />
            <label className="block ml-2 select-none cursor-pointer" htmlFor="scope-request">
              Per Request
            </label>
          </div>
        </div>
        <div className="text-xs text-muted mt-1">
          Choose where to store the custom order of request tabs (Params, Body, Auth, etc.).
        </div>
      </div>
    </StyledWrapper>
  );
};

export default RequestTabOrder;
