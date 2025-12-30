import React, { useEffect, useState } from 'react';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { useDispatch } from 'react-redux';
import ErrorMessage from 'components/ErrorMessage';
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

  const errors = [
    {
      title: 'Response example no longer exists',
      message: 'This can occur when the example definition in your local file has been deleted or updated.'
    }
  ];

  return (
    <div className="mt-6 px-6">
      <ErrorMessage errors={errors} className="mb-4" hideClose={true} />
      <Button size="md" color="secondary" variant="ghost" onClick={closeTab}>
        Close Tab
      </Button>
    </div>
  );
};

export default ExampleNotFound;
