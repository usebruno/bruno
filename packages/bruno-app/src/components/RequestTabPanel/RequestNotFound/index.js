import React, { useEffect, useState } from 'react';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';
import ErrorBanner from 'ui/ErrorBanner';
import Button from 'ui/Button';

const RequestNotFound = ({ itemUid }) => {
  const dispatch = useDispatch();
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  const closeTab = () => {
    dispatch(
      closeTabs({
        tabUids: [itemUid]
      })
    );
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

  const errors = [
    {
      title: 'Request no longer exists',
      message: 'This can happen when the .bru file associated with this request was deleted on your filesystem.'
    }
  ];

  return (
    <div className="mt-6 px-6">
      <ErrorBanner errors={errors} className="mb-4" />
      <Button size="md" color="secondary" variant="ghost" onClick={closeTab}>
        Close Tab
      </Button>
    </div>
  );
};

export default RequestNotFound;
