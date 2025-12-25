import React, { useEffect, useState } from 'react';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';
import Button from 'ui/Button';

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

  if (!showErrorMessage) {
    return null;
  }

  return (
    <div className="mt-6 px-6">
      <div className="p-4 bg-orange-100 border-l-4 border-yellow-500 text-yellow-700">
        <div>Response example no longer exists.</div>
        <div className="mt-2">
          This can occur when the example definition in your local file has been deleted or updated.
        </div>
      </div>
      <Button size="md" color="secondary" variant="ghost" onClick={closeTab}>
        Close Tab
      </Button>
    </div>
  );
};

export default ExampleNotFound;
