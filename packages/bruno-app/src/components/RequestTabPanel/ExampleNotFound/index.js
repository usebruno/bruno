import React, { useEffect, useState } from 'react';
import { closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import ErrorBanner from 'ui/ErrorBanner';
import Button from 'ui/Button';

const ExampleNotFound = ({ exampleUid }) => {
  const { t } = useTranslation();
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
      title: t('ERROR.EXAMPLE_NOT_FOUND_TITLE'),
      message: t('ERROR.EXAMPLE_NOT_FOUND_MESSAGE')
    }
  ];

  return (
    <div className="mt-6 px-6">
      <ErrorBanner errors={errors} className="mb-4" />
      <Button size="md" color="secondary" variant="ghost" onClick={closeTab}>
        {t('ERROR.CLOSE_TAB')}
      </Button>
    </div>
  );
};

export default ExampleNotFound;
