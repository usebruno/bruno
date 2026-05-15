import React from 'react';
import classnames from 'classnames';
import { IconAlertCircle } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import { useTranslation } from 'react-i18next';

const ScriptErrorIcon = ({ itemUid, onClick, className }) => {
  const toolhintId = `script-error-icon-${itemUid}`;
  const { t } = useTranslation();

  return (
    <>
      <div
        id={toolhintId}
        className={classnames('cursor-pointer ml-2', className)}
        data-testid="script-error-icon"
        onClick={onClick}
      >
        <div className="flex items-center text-red-400">
          <IconAlertCircle size={16} strokeWidth={1.5} className="stroke-current" />
        </div>
      </div>
      <ToolHint
        toolhintId={toolhintId}
        text={t('RESPONSE_PANE.SCRIPT_ERROR_OCCURRED')}
        place="bottom"
      />
    </>
  );
};

export default ScriptErrorIcon;
