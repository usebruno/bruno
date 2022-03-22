import React from 'react';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';

const RequestNotFound = ({itemUid}) => {
  const dispatch = useDispatch();

  const closeTab = () => {
    dispatch(closeTabs({
      tabUids: [itemUid]
    }));
  };

  return (
    <div className="mt-6 px-6">
      <div className="p-4 bg-orange-100 border-l-4 border-yellow-500 text-yellow-700 bg-yellow-100 p-4">
        <div>Request no longer exists.</div>
        <div className="mt-2">
          This can happen when the yml file associated with this request was deleted on your filesystem.
        </div>
      </div>
      <button className="btn btn-md btn-secondary mt-6" onClick={closeTab}>
        Close Tab
      </button>
    </div>
  );
};

export default RequestNotFound;
