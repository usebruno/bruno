import React, { useEffect, useState } from 'react';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';

const ExampleNotFound = ({ exampleUid }) => {
  const dispatch = useDispatch();
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  const closeTab = () => {
    dispatch(closeTabs({
      tabUids: [exampleUid]
    }));
  };

  useEffect(() => {
    setTimeout(() => {
      setShowErrorMessage(true);
    }, 300);
  }, []);

  // add a delay component in react that shows a loading spinner
  // and then shows the error message after a delay
  // this will prevent the error message from flashing on the screen

  if (!showErrorMessage) {
    return null;
  }

  return (
    <div className="mt-6 px-6">
      <div className="p-4 bg-orange-100 border-l-4 border-yellow-500 text-yellow-700">
        <div>Response example no longer exists.</div>
        <div className="mt-2">
          This can happen when the example was deleted from the .bru file or the file was modified on your filesystem.
        </div>
      </div>
      <button className="btn btn-md btn-secondary mt-6" onClick={closeTab}>
        Close Tab
      </button>
    </div>
  );
};

export default ExampleNotFound;
