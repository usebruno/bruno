import React from 'react';
import { IconLoader2 } from '@tabler/icons';
import { useTranslation } from 'react-i18next';

const RequestTabPanelLoading = ({ name }) => {
  const { t } = useTranslation();
  const displayName = name ? `"${name}"` : t('REQUEST_TAB_PANEL.REQUEST_LOWER');
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
      <IconLoader2 className="animate-spin" size={24} strokeWidth={1.5} />
      <span>{t('REQUEST_TAB_PANEL.LOADING_REQUEST', { name: displayName })}</span>
    </div>
  );
};

export default RequestTabPanelLoading;
