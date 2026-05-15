import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconFileOff } from '@tabler/icons';

const DotEnvEmptyState = () => {
  const { t } = useTranslation();
  return (
    <div className="empty-state">
      <IconFileOff size={48} strokeWidth={1.5} />
      <div className="title">{t('ENVIRONMENTS.NO_DOTENV_FILE')}</div>
      <div className="description">
        {t('ENVIRONMENTS.ADD_VARIABLE_HINT')}
      </div>
    </div>
  );
};

export default DotEnvEmptyState;
